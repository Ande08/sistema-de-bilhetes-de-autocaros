import { Bilhete, Pagamento, Trip } from '../models/index.js';

export async function cancelarBilhete(codigo, transacao) {
  const bilhete = await Bilhete.findOne({ where: { codigo }, include: [Pagamento, Trip], transaction: transacao, lock: transacao.LOCK.UPDATE });
  if (!bilhete) {
    const erro = new Error('Bilhete não encontrado.');
    erro.statusCode = 404;
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

export async function cancelarViagem(id) {
  const viagem = await Trip.findByPk(id);
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
  await viagem.update({ status: 'CANCELADA' });
  return viagem;
}
