import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Bilhete, Notificacao, Route, Trip, User } from '../models/index.js';
import { enfileirarEnvioWhatsapp } from './fila-whatsapp.service.js';
import { filtroEmpresa } from './empresa-escopo.service.js';

export async function enviarAvisoManualViagem(viagemId, conteudo, utilizador) {
  const mensagem = String(conteudo || '').trim();
  if (mensagem.length < 10 || mensagem.length > 1000) erroHttp('O aviso deve ter entre 10 e 1000 caracteres.', 400);

  return sequelize.transaction(async (transaction) => {
    const viagem = await Trip.findOne({ where: { id: viagemId, ...filtroEmpresa(utilizador) }, include: [Route], transaction });
    if (!viagem) erroHttp('Viagem não encontrada.', 404);
    if (['CONCLUIDA', 'CANCELADA'].includes(viagem.status)) erroHttp('Não é possível enviar um novo aviso para esta viagem.', 409);
    const bilhetes = await Bilhete.findAll({
      where: { viagemId, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } },
      include: [{ model: User, attributes: ['id', 'telefone'] }], transaction
    });
    const campanha = randomUUID();
    const texto = `FambaTicket\n\nAviso sobre a viagem ${viagem.Route.origin} para ${viagem.Route.destination}, com partida em ${formatarDataHora(viagem.departureAt)}:\n\n${mensagem}\n\nConsulte o sistema para informações atualizadas.`;
    const total = await criarAvisosParaPassageiros({ viagem, bilhetes, titulo: 'Aviso de viagem', texto, campanha, transaction });
    return { totalDestinatarios: total, viagemId: viagem.id };
  });
}

export async function enfileirarCancelamentoViagem({ viagem, bilhetes, transaction }) {
  const texto = `FambaTicket\n\nA viagem ${viagem.Route.origin} para ${viagem.Route.destination}, prevista para ${formatarDataHora(viagem.departureAt)}, foi cancelada. O bilhete foi cancelado e, quando aplicável, o pagamento ficou marcado como reembolsado na simulação.\n\nConsulte a sua conta ou contacte o suporte.`;
  return criarAvisosParaPassageiros({ viagem, bilhetes, titulo: 'Viagem cancelada', texto, campanha: `CANCELAMENTO-${viagem.id}`, transaction });
}

async function criarAvisosParaPassageiros({ viagem, bilhetes, titulo, texto, campanha, transaction }) {
  const passageiros = new Map();
  bilhetes.forEach((bilhete) => {
    if (bilhete.User?.telefone && bilhete.utilizadorId) passageiros.set(String(bilhete.utilizadorId), bilhete.User);
  });
  for (const [utilizadorId, utilizador] of passageiros) {
    await Notificacao.create({ utilizadorId, titulo, mensagem: texto.replace('FambaTicket\n\n', ''), tipo: 'VIAGEM' }, { transaction });
    await enfileirarEnvioWhatsapp({
      tipo: 'AVISO_VIAGEM', utilizadorId, viagemId: viagem.id, telefone: utilizador.telefone,
      mensagem: texto, chaveIdempotencia: `AVISO:${campanha}:${utilizadorId}`, prioridade: 20, maxTentativas: 10
    }, { transaction });
  }
  return passageiros.size;
}

function formatarDataHora(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' }).format(new Date(valor)); }
function erroHttp(mensagem, statusCode) { const erro = new Error(mensagem); erro.statusCode = statusCode; throw erro; }
