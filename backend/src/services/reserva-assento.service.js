import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Assento, Bilhete, Reserva, Trip } from '../models/index.js';

const ESTADOS_BILHETE_OCUPADO = ['RESERVADO', 'EMITIDO'];
export const MAXIMO_BILHETES_POR_COMPRA = 6;

export async function reservarAssentoTemporariamente({ viagemId, assentoId, utilizadorId }) {
  return sequelize.transaction(async (transaction) => {
    // A mesma ordem de bloqueio é usada na compra para evitar deadlocks.
    const viagem = await Trip.findByPk(viagemId, { transaction, lock: transaction.LOCK.UPDATE });
    validarViagem(viagem);
    const assento = await Assento.findByPk(assentoId, { transaction, lock: transaction.LOCK.UPDATE });
    validarAssento(assento, viagem);

    const bilhete = await Bilhete.findOne({
      where: { viagemId, assentoId, estado: { [Op.in]: ESTADOS_BILHETE_OCUPADO } },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (bilhete) throw erroConflito('Este assento já foi vendido. Escolha outro lugar.');

    const agora = new Date();
    const reserva = await Reserva.findOne({
      where: { viagemId, assentoId }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (reserva?.estado === 'PENDENTE' && reserva.expiraEm > agora
      && String(reserva.utilizadorId) !== String(utilizadorId)) {
      throw erroConflito('Este assento está temporariamente reservado por outro utilizador.');
    }

    // Uma compra pode bloquear vários assentos. O limite evita que uma única
    // sessão retenha uma parte excessiva do autocarro durante a escolha.
    const anteriores = await Reserva.findAll({
      where: {
        viagemId,
        utilizadorId,
        estado: 'PENDENTE',
        expiraEm: { [Op.gt]: agora },
        assentoId: { [Op.ne]: assentoId }
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (anteriores.length >= MAXIMO_BILHETES_POR_COMPRA) throw erroConflito(`Pode selecionar no máximo ${MAXIMO_BILHETES_POR_COMPRA} assentos por compra.`);

    const expiraEm = novaExpiracao();
    if (reserva) {
      await reserva.update({ utilizadorId, estado: 'PENDENTE', expiraEm }, { transaction });
    } else {
      await Reserva.create({ utilizadorId, viagemId, assentoId, estado: 'PENDENTE', expiraEm }, { transaction });
    }
    return { viagemId: Number(viagemId), assentoId: Number(assentoId), expiraEm, libertados: [] };
  });
}

export async function libertarReservaAssento({ viagemId, assentoId, utilizadorId }) {
  return sequelize.transaction(async (transaction) => {
    const reserva = await Reserva.findOne({
      where: { viagemId, assentoId }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (!reserva || reserva.estado !== 'PENDENTE' || String(reserva.utilizadorId) !== String(utilizadorId)) {
      return { libertado: false, viagemId: Number(viagemId), assentoId: Number(assentoId) };
    }
    await reserva.update({ estado: 'CANCELADA' }, { transaction });
    return { libertado: true, viagemId: Number(viagemId), assentoId: Number(assentoId) };
  });
}

export function reservaPertenceAoUtilizador(reserva, utilizadorId, agora = new Date()) {
  return Boolean(reserva
    && reserva.estado === 'PENDENTE'
    && reserva.expiraEm > agora
    && String(reserva.utilizadorId) === String(utilizadorId));
}

function novaExpiracao() {
  const minutos = Math.min(Math.max(Number(process.env.RESERVA_ASSENTO_MINUTOS) || 3, 1), 10);
  return new Date(Date.now() + minutos * 60 * 1000);
}

function validarViagem(viagem) {
  if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
    const erro = new Error('Esta viagem não está disponível para seleção de assentos.');
    erro.statusCode = 409;
    throw erro;
  }
}

function validarAssento(assento, viagem) {
  if (!assento || String(assento.autocarroId) !== String(viagem.busId)) {
    const erro = new Error('O assento não pertence ao autocarro desta viagem.');
    erro.statusCode = 409;
    throw erro;
  }
}

function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
