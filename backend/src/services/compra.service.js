import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Pagamento, Route, Trip, User } from '../models/index.js';
import { ServicoBilhete } from './ticket.service.js';
import { gatewayPagamentoSimulado } from './gateway-pagamento-simulado.service.js';

export class ServicoCompra {
  constructor() {
    this.servicoBilhete = new ServicoBilhete();
  }

  async comprar({ utilizadorId, operadorId = utilizadorId, viagemId, assentoId, metodoPagamento, referenciaPagamento }) {
    if (!viagemId || !assentoId || !metodoPagamento || !referenciaPagamento) {
      const erro = new Error('Viagem, assento, método e referência de pagamento são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }

    const pagamentoProcessado = gatewayPagamentoSimulado.reservarAprovado({
      referencia: referenciaPagamento,
      utilizadorId: operadorId
    });

    try {
      const compra = await sequelize.transaction(async (transacao) => {
        // As consultas são sequenciais porque partilham a mesma ligação transacional.
        const utilizador = await User.findByPk(utilizadorId, { transaction: transacao });
        const viagem = await Trip.findByPk(viagemId, { include: [Route], transaction: transacao, lock: transacao.LOCK.UPDATE });
        const assento = await Assento.findByPk(assentoId, { transaction: transacao, lock: transacao.LOCK.UPDATE });

        this._validarCompra({ utilizador, viagem, assento });
        const bilheteExistente = await Bilhete.findOne({
          where: { viagemId: viagem.id, assentoId: assento.id, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } },
          transaction: transacao,
          lock: transacao.LOCK.UPDATE
        });
        if (bilheteExistente) {
          const erro = new Error('Este assento já foi vendido para esta viagem.');
          erro.statusCode = 409;
          throw erro;
        }

        // A API falsa precisa aprovar a transação antes da atribuição do assento.
        if (pagamentoProcessado.metodo !== String(metodoPagamento).toUpperCase()
          || Number(pagamentoProcessado.valor) !== Number(viagem.price)) {
          const erro = new Error('A referência não corresponde ao método ou ao valor desta viagem.');
          erro.statusCode = 409;
          throw erro;
        }

        const nomeCompleto = `${utilizador.nome} ${utilizador.apelido}`;
        const bilheteConstruido = this.servicoBilhete.emitir({
          passageiro: { nome: nomeCompleto },
          viagem: { id: viagem.id, origem: viagem.Route.origin, destino: viagem.Route.destination, partidaEm: viagem.departureAt },
          assento: { id: assento.id, numero: assento.numero },
          pagamento: pagamentoProcessado,
          preco: viagem.price
        });

        const bilhete = await Bilhete.create({
          codigo: bilheteConstruido.codigo,
          utilizadorId: utilizador.id,
          viagemId: viagem.id,
          assentoId: assento.id,
          nomePassageiro: nomeCompleto,
          preco: viagem.price,
          estado: 'EMITIDO'
        }, { transaction: transacao });
        const pagamento = await Pagamento.create({
          bilheteId: bilhete.id,
          metodo: pagamentoProcessado.metodo,
          referencia: pagamentoProcessado.referencia,
          valor: pagamentoProcessado.valor,
          estado: pagamentoProcessado.estado
        }, { transaction: transacao });

        return { pagamento, bilhete: { ...bilhete.toJSON(), viagem: bilheteConstruido.viagem, assento: bilheteConstruido.assento } };
      });
      gatewayPagamentoSimulado.concluirUtilizacao(referenciaPagamento);
      return compra;
    } catch (erro) {
      gatewayPagamentoSimulado.libertarReserva(referenciaPagamento);
      throw erro;
    }
  }

  _validarCompra({ utilizador, viagem, assento }) {
    if (!utilizador?.activo || utilizador.perfil !== 'PASSAGEIRO') {
      const erro = new Error('A conta do passageiro não está disponível.');
      erro.statusCode = 403;
      throw erro;
    }
    if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
      const erro = new Error('Esta viagem não está disponível para compra.');
      erro.statusCode = 409;
      throw erro;
    }
    if (!assento || String(assento.autocarroId) !== String(viagem.busId)) {
      const erro = new Error('O assento não pertence ao autocarro desta viagem.');
      erro.statusCode = 409;
      throw erro;
    }
  }
}
