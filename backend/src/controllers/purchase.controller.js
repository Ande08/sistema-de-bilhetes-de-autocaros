import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Pagamento, Route, Trip } from '../models/index.js';
import { ServicoPagamento } from '../services/payment.service.js';
import { ServicoBilhete } from '../services/ticket.service.js';

const servicoPagamento = new ServicoPagamento();
const servicoBilhete = new ServicoBilhete();

export async function criarCompra(req, res, next) {
  let transacao;
  try {
    transacao = await sequelize.transaction();
    const { passageiro, viagemId, assento: dadosAssento, metodoPagamento } = req.body;
    const viagem = await Trip.findByPk(viagemId, {
      include: [Route],
      transaction: transacao,
      lock: transacao.LOCK.UPDATE
    });

    if (!passageiro?.nome || !dadosAssento?.id || !viagem) {
      const error = new Error('Passageiro, viagem e assento são obrigatórios');
      error.statusCode = 400;
      throw error;
    }

    // Apenas viagens agendadas podem receber novas compras.
    if (viagem.status !== 'AGENDADA') {
      const error = new Error('Esta viagem não está disponível para compra.');
      error.statusCode = 409;
      throw error;
    }

    // Uma viagem que já começou ou cuja data passou não aceita compras.
    if (new Date(viagem.departureAt) <= new Date()) {
      const error = new Error('Não é possível comprar uma viagem que já começou.');
      error.statusCode = 409;
      throw error;
    }

    const assento = await Assento.findByPk(dadosAssento.id, { transaction: transacao, lock: transacao.LOCK.UPDATE });
    if (!assento) {
      const error = new Error('Assento não encontrado');
      error.statusCode = 409;
      throw error;
    }

    // O assento deve pertencer ao autocarro associado à viagem.
    if (String(assento.autocarroId) !== String(viagem.busId)) {
      const error = new Error('O assento não pertence ao autocarro desta viagem.');
      error.statusCode = 409;
      throw error;
    }

    // A consulta dentro da mesma transação protege contra compra duplicada.
    const bilheteExistente = await Bilhete.findOne({
      where: { viagemId: viagem.id, assentoId: assento.id },
      transaction: transacao,
      lock: transacao.LOCK.UPDATE
    });
    if (bilheteExistente && bilheteExistente.estado !== 'CANCELADO') {
      const error = new Error('Este assento já foi vendido para esta viagem.');
      error.statusCode = 409;
      throw error;
    }

    const pagamentoSimulado = servicoPagamento.processar({
      metodo: metodoPagamento,
      valor: viagem.price
    });

    if (pagamentoSimulado.estado !== 'APROVADO') {
      const error = new Error('Pagamento rejeitado');
      error.statusCode = 402;
      throw error;
    }

    // O Builder concentra a construção e validação dos dados do bilhete.
    const bilheteConstruido = servicoBilhete.emitir({
      passageiro: { nome: passageiro.nome },
      viagem: {
        id: viagem.id,
        origem: viagem.Route?.origin || null,
        destino: viagem.Route?.destination || null,
        partidaEm: viagem.departureAt
      },
      assento: { id: assento.id, numero: assento.numero },
      pagamento: pagamentoSimulado,
      preco: viagem.price
    });

    const bilhete = await Bilhete.create({
      codigo: bilheteConstruido.codigo,
      viagemId: viagem.id,
      assentoId: assento.id,
      nomePassageiro: passageiro.nome,
      preco: viagem.price,
      estado: 'EMITIDO'
    }, { transaction: transacao });

    const pagamento = await Pagamento.create({
      bilheteId: bilhete.id,
      metodo: pagamentoSimulado.metodo,
      referencia: pagamentoSimulado.referencia,
      valor: pagamentoSimulado.valor,
      estado: pagamentoSimulado.estado
    }, { transaction: transacao });

    await transacao.commit();

    return res.status(201).json({ sucesso: true, dados: { pagamento, bilhete } });
  } catch (erro) {
    if (transacao && !transacao.finished) await transacao.rollback();
    return next(erro);
  }
}

export async function consultarBilhete(req, res, next) {
  try {
  const bilhete = await Bilhete.findOne({ where: { codigo: req.params.codigo }, include: [Pagamento, Trip, Assento] });
  if (!bilhete) {
    const error = new Error('Bilhete não encontrado');
    error.statusCode = 404;
    return next(error);
  }
  return res.json({ sucesso: true, dados: bilhete });
  } catch (erro) { return next(erro); }
}
