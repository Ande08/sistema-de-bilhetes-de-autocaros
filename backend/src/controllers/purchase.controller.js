import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Pagamento, Trip } from '../models/index.js';
import { ServicoPagamento } from '../services/payment.service.js';

const servicoPagamento = new ServicoPagamento();
export async function createPurchase(req, res, next) {
  const transacao = await sequelize.transaction();
  try {
    const { passenger, tripId, seat, paymentMethod } = req.body;
    const viagem = await Trip.findByPk(tripId, { transaction: transacao, lock: transacao.LOCK.UPDATE });

    if (!passenger?.name || !seat?.id || !viagem) {
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

    const assento = await Assento.findByPk(seat.id, { transaction: transacao, lock: transacao.LOCK.UPDATE });
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

    const servicoPagamento = new ServicoPagamento();
    const pagamentoSimulado = servicoPagamento.processar({
      metodo: paymentMethod,
      valor: viagem.price
    });

    if (pagamentoSimulado.estado !== 'APROVADO') {
      const error = new Error('Pagamento rejeitado');
      error.statusCode = 402;
      throw error;
    }

    const bilhete = await Bilhete.create({
      codigo: `BIL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      viagemId: viagem.id,
      assentoId: assento.id,
      nomePassageiro: passenger.name,
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
  } catch (error) {
    await transacao.rollback();
    return next(error);
  }
}

export async function getTicket(req, res, next) {
  try {
  const bilhete = await Bilhete.findOne({ where: { codigo: req.params.code }, include: [Pagamento, Trip, Assento] });
  if (!bilhete) {
    const error = new Error('Bilhete não encontrado');
    error.statusCode = 404;
    return next(error);
  }
  return res.json({ sucesso: true, dados: bilhete });
  } catch (erro) { return next(erro); }
}
