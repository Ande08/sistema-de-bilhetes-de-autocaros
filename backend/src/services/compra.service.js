import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Pagamento, Reserva, Route, Trip, User } from '../models/index.js';
import { ServicoBilhete } from './ticket.service.js';
import { gatewayPagamentoSimulado } from './gateway-pagamento-simulado.service.js';
import { MAXIMO_BILHETES_POR_COMPRA, reservaPertenceAoUtilizador } from './reserva-assento.service.js';
import { calcularPrecoComCupao } from './cupao.service.js';

export function normalizarPedidoAssentos({ assentoId, assentoIds, quantidade, atribuicaoAutomatica }) {
  const ids = [...new Set((Array.isArray(assentoIds) ? assentoIds : assentoId ? [assentoId] : [])
    .map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const total = Number(quantidade ?? (ids.length || 1));
  if (!Number.isInteger(total) || total < 1 || total > MAXIMO_BILHETES_POR_COMPRA) {
    const erro = new Error(`A compra deve ter entre 1 e ${MAXIMO_BILHETES_POR_COMPRA} bilhetes.`); erro.statusCode = 400; throw erro;
  }
  const automatica = Boolean(atribuicaoAutomatica);
  if (!automatica && ids.length !== total) {
    const erro = new Error(`Selecione exactamente ${total} assento(s) ou escolha a atribuição automática.`); erro.statusCode = 400; throw erro;
  }
  return { ids, quantidade: total, atribuicaoAutomatica: automatica };
}

export class ServicoCompra {
  constructor() { this.servicoBilhete = new ServicoBilhete(); }

  async comprar({ utilizadorId, operador, operadorId = utilizadorId, viagemId, assentoId, assentoIds, quantidade, atribuicaoAutomatica, metodoPagamento, referenciaPagamento, codigoCupao }) {
    if (!viagemId || !metodoPagamento || !referenciaPagamento) {
      const erro = new Error('Viagem, método e referência de pagamento são obrigatórios.'); erro.statusCode = 400; throw erro;
    }
    const pedido = normalizarPedidoAssentos({ assentoId, assentoIds, quantidade, atribuicaoAutomatica });
    const pagamentoProcessado = gatewayPagamentoSimulado.reservarAprovado({ referencia: referenciaPagamento, utilizadorId: operadorId });

    try {
      const compra = await sequelize.transaction(async (transacao) => {
        // Todas as compras da mesma viagem bloqueiam primeiro a viagem. Assim,
        // duas compras automáticas ou manuais nunca recebem o mesmo assento.
        const utilizador = await User.findByPk(utilizadorId, { transaction: transacao });
        const viagem = await Trip.findByPk(viagemId, { include: [Route], transaction: transacao, lock: transacao.LOCK.UPDATE });
        this._validarCompra({ utilizador, viagem, operador });

        const assentos = await this._obterAssentosDaCompra({ pedido, viagem, operadorId, transacao });
        const resumoCupao = await calcularPrecoComCupao({
          codigo: codigoCupao, viagem, utilizadorId: utilizador.id, quantidade: pedido.quantidade,
          transaction: transacao, bloquear: true
        });

        if (pagamentoProcessado.metodo !== String(metodoPagamento).toUpperCase()
          || Number(pagamentoProcessado.valor) !== Number(resumoCupao.valorFinal)
          || (pagamentoProcessado.cupaoCodigo || null) !== (resumoCupao.codigo || null)) {
          const erro = new Error('A referência não corresponde ao método, à quantidade ou ao valor desta compra.'); erro.statusCode = 409; throw erro;
        }

        const nomeCompleto = `${utilizador.nome} ${utilizador.apelido}`;
        const bilhetes = [];
        const pagamentos = [];
        for (let indice = 0; indice < assentos.length; indice += 1) {
          const assento = assentos[indice];
          const referenciaBilhete = assentos.length === 1 ? pagamentoProcessado.referencia : `${pagamentoProcessado.referencia}-${indice + 1}`;
          const pagamentoBilhete = { ...pagamentoProcessado, referencia: referenciaBilhete, valor: resumoCupao.valorUnitarioFinal };
          const construído = this.servicoBilhete.emitir({
            passageiro: { nome: nomeCompleto },
            viagem: { id: viagem.id, origem: viagem.Route.origin, destino: viagem.Route.destination, partidaEm: viagem.departureAt },
            assento: { id: assento.id, numero: assento.numero }, pagamento: pagamentoBilhete,
            preco: resumoCupao.valorUnitarioFinal
          });
          const bilhete = await Bilhete.create({
            codigo: construído.codigo, utilizadorId: utilizador.id, viagemId: viagem.id, assentoId: assento.id,
            nomePassageiro: nomeCompleto, cupaoId: resumoCupao.cupao?.id || null,
            preco: resumoCupao.valorUnitarioFinal, precoOriginal: resumoCupao.precoUnitarioOriginal,
            desconto: resumoCupao.descontoUnitario, estado: 'EMITIDO'
          }, { transaction: transacao });
          const pagamento = await Pagamento.create({
            bilheteId: bilhete.id, metodo: pagamentoProcessado.metodo, referencia: referenciaBilhete,
            valor: resumoCupao.valorUnitarioFinal, estado: pagamentoProcessado.estado
          }, { transaction: transacao });
          await Reserva.update({ estado: 'CONFIRMADA' }, {
            where: { viagemId: viagem.id, assentoId: assento.id, utilizadorId: operadorId, estado: 'PENDENTE' }, transaction: transacao
          });
          bilhetes.push({ ...bilhete.toJSON(), viagem: construído.viagem, assento: construído.assento });
          pagamentos.push(pagamento);
        }

        if (resumoCupao.cupao) await resumoCupao.cupao.increment('totalUtilizacoes', { by: pedido.quantidade, transaction: transacao });
        return {
          quantidade: pedido.quantidade, valorTotal: resumoCupao.valorFinal, pagamentos,
          pagamento: pagamentos[0], bilhetes, bilhete: bilhetes[0],
          cupao: resumoCupao.cupao ? { codigo: resumoCupao.codigo, percentagem: resumoCupao.percentagem, desconto: resumoCupao.desconto } : null
        };
      });
      gatewayPagamentoSimulado.concluirUtilizacao(referenciaPagamento);
      return compra;
    } catch (erro) {
      gatewayPagamentoSimulado.libertarReserva(referenciaPagamento);
      if (erro.name === 'SequelizeUniqueConstraintError') {
        const conflito = new Error('Um dos assentos acabou de ser vendido. Escolha novamente.'); conflito.statusCode = 409; throw conflito;
      }
      throw erro;
    }
  }

  async _obterAssentosDaCompra({ pedido, viagem, operadorId, transacao }) {
    const candidatos = await Assento.findAll({
      where: pedido.atribuicaoAutomatica ? { autocarroId: viagem.busId } : { id: { [Op.in]: pedido.ids } },
      order: [['fila', 'ASC'], ['coluna', 'ASC']], transaction: transacao, lock: transacao.LOCK.UPDATE
    });
    if (!pedido.atribuicaoAutomatica && candidatos.length !== pedido.quantidade) throw erroConflito('Um ou mais assentos não existem neste autocarro.');
    candidatos.forEach((assento) => this._validarCompra({ viagem, assento }));

    const ids = candidatos.map((item) => item.id);
    // Consultas sequenciais: uma transação Sequelize usa uma única ligação.
    const vendidos = await Bilhete.findAll({ where: { viagemId: viagem.id, assentoId: { [Op.in]: ids }, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } }, transaction: transacao, lock: transacao.LOCK.UPDATE });
    const reservas = await Reserva.findAll({ where: { viagemId: viagem.id, assentoId: { [Op.in]: ids }, estado: 'PENDENTE', expiraEm: { [Op.gt]: new Date() } }, transaction: transacao, lock: transacao.LOCK.UPDATE });
    const ocupados = new Set(vendidos.map((item) => String(item.assentoId)));
    const reservasPorAssento = new Map(reservas.map((item) => [String(item.assentoId), item]));

    if (pedido.atribuicaoAutomatica) {
      const livres = candidatos.filter((assento) => {
        const reserva = reservasPorAssento.get(String(assento.id));
        return !ocupados.has(String(assento.id)) && (!reserva || String(reserva.utilizadorId) === String(operadorId));
      });
      if (livres.length < pedido.quantidade) throw erroConflito('Não existem assentos suficientes para atribuição automática.');
      return livres.slice(0, pedido.quantidade);
    }
    for (const assento of candidatos) {
      if (ocupados.has(String(assento.id))) throw erroConflito('Um dos assentos selecionados já foi vendido.');
      if (!reservaPertenceAoUtilizador(reservasPorAssento.get(String(assento.id)), operadorId)) {
        throw erroConflito('A reserva de um dos assentos expirou ou pertence a outro usuário. Selecione novamente.');
      }
    }
    return candidatos;
  }

  _validarCompra({ utilizador, viagem, assento, operador }) {
    if (utilizador && (!utilizador.activo || utilizador.perfil !== 'PASSAGEIRO')) throw erroAcesso('A conta do passageiro não está disponível.');
    if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) throw erroConflito('Esta viagem não está disponível para compra.');
    if (operador && ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(operador.perfil) && String(operador.empresaId) !== String(viagem.empresaId)) throw erroAcesso('O atendente só pode vender bilhetes da própria empresa.');
    if (assento && String(assento.autocarroId) !== String(viagem.busId)) throw erroConflito('O assento não pertence ao autocarro desta viagem.');
  }
}

function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
function erroAcesso(mensagem) { const erro = new Error(mensagem); erro.statusCode = 403; return erro; }
