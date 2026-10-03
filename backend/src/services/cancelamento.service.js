import { Op } from 'sequelize';
import { Bilhete, Pagamento, Trip } from '../models/index.js';

export async function cancelarBilhete(codigo, utilizadorAutenticado, transacao) {
  const bilhete = await Bilhete.findOne({ where: { codigo }, include: [Pagamento, Trip], transaction: transacao, lock: transacao.LOCK.UPDATE });
  if (!bilhete) {
    const erro = new Error('Bilhete não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }
  if (utilizadorAutenticado.perfil !== 'ADMIN' && String(bilhete.utilizadorId) !== String(utilizadorAutenticado.id)) {
    const erro = new Error('Não tem permissão para cancelar este bilhete.');
    erro.statusCode = 403;
    throw erro;
  }
  if (bilhete.estado !== 'EMITIDO' && bilhete.estado !== 'RESERVADO') {
    const erro = new Error('Este bilhete já foi cancelado.');
    erro.statusCode = 409;
    throw erro;
  }
  if (new Date(bilhete.Trip.departureAt) <= new Date()) {
    const erro = new Error('Não é possível cancelar uma viagem que já começou.');
    erro.statusCode = 409;
    throw erro;
  }

  await bilhete.update({ estado: 'CANCELADO' }, { transaction: transacao });
  if (bilhete.Pagamento && bilhete.Pagamento.estado === 'APROVADO') {
    // O reembolso é simulado nesta fase.
    await bilhete.Pagamento.update({ estado: 'REEMBOLSADO' }, { transaction: transacao });
  }
  return bilhete;
}

export async function cancelarViagem(id, transacao) {
  const viagem = await Trip.findByPk(id, { transaction: transacao, lock: transacao.LOCK.UPDATE });
  if (!viagem) {
    const erro = new Error('Viagem não encontrada.');
    erro.statusCode = 404;
    throw erro;
  }
  if (viagem.status !== 'AGENDADA') {
    const erro = new Error('Apenas viagens agendadas podem ser canceladas.');
    erro.statusCode = 409;
    throw erro;
  }
  const bilhetes = await Bilhete.findAll({ where: { viagemId: id, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } }, include: [Pagamento], transaction: transacao, lock: transacao.LOCK.UPDATE });
  for (const bilhete of bilhetes) {
    await bilhete.update({ estado: 'CANCELADO' }, { transaction: transacao });
    if (bilhete.Pagamento?.estado === 'APROVADO') await bilhete.Pagamento.update({ estado: 'REEMBOLSADO' }, { transaction: transacao });
  }
  await viagem.update({ status: 'CANCELADA' }, { transaction: transacao });
  return viagem;
}
