import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Pagamento, Route, Trip, User } from '../models/index.js';
import { ServicoPagamento } from './payment.service.js';
import { ServicoBilhete } from './ticket.service.js';

export class ServicoCompra {
  constructor() {
    this.servicoPagamento = new ServicoPagamento();
    this.servicoBilhete = new ServicoBilhete();
  }

  async comprar({ utilizadorId, viagemId, assentoId, metodoPagamento }) {
    if (!viagemId || !assentoId || !metodoPagamento) {
      const erro = new Error('Viagem, assento e método de pagamento são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }

    return sequelize.transaction(async (transacao) => {
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

      // Regra do projecto: confirmar pagamento antes de atribuir o assento.
      const pagamentoProcessado = this.servicoPagamento.processar({ metodo: metodoPagamento, valor: viagem.price });
      if (pagamentoProcessado.estado !== 'APROVADO') {
        const erro = new Error('O pagamento não foi aprovado.');
        erro.statusCode = 402;
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
  }

  _validarCompra({ utilizador, viagem, assento }) {
    if (!utilizador?.activo) {
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
