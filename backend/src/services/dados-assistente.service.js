import { Op } from 'sequelize';
import { Bus, Empresa, Route, Trip } from '../models/index.js';
import { listarAssentosDaViagem } from './assento.service.js';
import { obterResumoConta } from './conta.service.js';

const PADROES_CONTA = /\b(meu|minha|meus|minhas)\s+(bilhete|bilhetes|viagem|viagens|pagamento|pagamentos|conta|reserva|reservas)\b|\bpr[oó]xima\s+viagem\b/i;
const PADROES_VIAGEM_REAL = /quanto\s+custa|quanto\s+(?:é|e)\s+(?:a\s+)?passagem|pre[cç]o|valor\s+da\s+(?:viagem|passagem)|hor[aá]rio|quando\s+(?:sai|parte|tem\s+autocarro)|(?:tem|h[aá])\s+(?:viagem|autocarro)|autocarro\s+para|viagens?\s+dispon[ií]ve|quais\s+viagens|listar\s+viagens|assentos?\s+dispon[ií]ve|lugares?\s+(?:vagos|dispon[ií]ve)|viajar\s+de|rota\s+de|\bde\s+[\p{L}\s'-]{2,50}\s+para\s+[\p{L}\s'-]{2,50}/iu;

export function identificarConsultaProtegida(mensagem) {
  if (PADROES_CONTA.test(mensagem)) return 'CONTA';
  if (PADROES_VIAGEM_REAL.test(mensagem)) return 'VIAGENS';
  return null;
}

export async function responderComDadosConfirmados(mensagem, utilizadorId) {
  const tipo = identificarConsultaProtegida(mensagem);
  if (tipo === 'CONTA') return responderConta(utilizadorId, mensagem);
  if (tipo === 'VIAGENS') return responderViagens(mensagem);
  return null;
}

async function responderConta(utilizadorId, mensagem) {
  const resumo = await obterResumoConta(utilizadorId);
  const normalizada = normalizar(mensagem);

  if (normalizada.includes('pagamento')) {
    if (!resumo.pagamentos.length) return respostaBaseDados('Não encontrei pagamentos associados à sua conta.');
    const ultimo = resumo.pagamentos[0];
    return respostaBaseDados(`O seu pagamento mais recente está no estado ${traduzirEstado(ultimo.estado)} e possui o valor de ${formatarDinheiro(ultimo.valor)}. Por segurança, consulte a área “Pagamentos” para ver a referência completa.`);
  }

  if (normalizada.includes('bilhete') && !normalizada.includes('viagem')) {
    return respostaBaseDados(`A sua conta possui ${resumo.totalBilhetesActivos} bilhete(s) ativo(s) para viagens futuras. Consulte “Bilhetes” para ver códigos e outros detalhes privados.`);
  }

  const proxima = resumo.proximaViagem;
  if (!proxima) return respostaBaseDados('Não encontrei uma próxima viagem ativa na sua conta.');
  return respostaBaseDados(`A sua próxima viagem é de ${proxima.viagem.origem} para ${proxima.viagem.destino}, com partida em ${formatarDataHora(proxima.viagem.partidaEm)}. O seu assento é ${proxima.assento?.numero || 'a confirmar'}.`);
}

async function responderViagens(mensagem) {
  const viagens = await Trip.findAll({
    where: { status: 'AGENDADA', departureAt: { [Op.gt]: new Date() } },
    include: [{ model: Route, where: { active: true } }, Bus, { model: Empresa, where: { activa: true }, attributes: ['nome'], required: true }],
    order: [['departureAt', 'ASC']], limit: 30
  });
  if (!viagens.length) return respostaBaseDados('Neste momento não existem viagens futuras disponíveis no sistema.');

  const texto = normalizar(mensagem);
  const porLocal = viagens.filter((viagem) => texto.includes(normalizar(viagem.Route.origin)) || texto.includes(normalizar(viagem.Route.destination)));
  const seleccionadas = (porLocal.length ? porLocal : viagens).slice(0, 5);
  const detalhes = await Promise.all(seleccionadas.map(async (viagem) => {
    const assentos = await listarAssentosDaViagem(viagem.id);
    const disponiveis = assentos.filter((item) => item.disponivel).length;
    return `${viagem.Empresa.nome} — ${viagem.Route.origin} → ${viagem.Route.destination}: ${formatarDinheiro(viagem.price)}, partida ${formatarDataHora(viagem.departureAt)}, ${disponiveis} lugar(es) disponível(is)`;
  }));
  const introducao = porLocal.length ? 'Encontrei estas viagens confirmadas:' : 'Estas são as próximas viagens confirmadas. Para restringir a pesquisa, indique a origem e o destino:';
  return respostaBaseDados(`${introducao}\n${detalhes.map((item) => `• ${item}`).join('\n')}`);
}

export function removerDadosSensiveis(texto) {
  return String(texto)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL REMOVIDO]')
    .replace(/(?:\+?258[\s-]?)?8[2-7](?:[\s-]?\d){7}\b/g, '[TELEFONE REMOVIDO]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARTÃO REMOVIDO]')
    .replace(/\+?\d(?:[\s-]?\d){8,14}\b/g, '[CONTACTO REMOVIDO]')
    .replace(/\bsk-or-v1-[A-Za-z0-9_-]+\b/gi, '[CHAVE REMOVIDA]')
    .replace(/\b(?:cvv|senha|palavra-passe|password|token)\s*[:=]\s*\S+/gi, '$1: [SEGREDO REMOVIDO]')
    .replace(/\b(?:BI|NUIT|passaporte|documento)\s*[:=]\s*[A-Z0-9/-]+/gi, '$1: [DOCUMENTO REMOVIDO]')
    .replace(/\bmeu\s+nome\s+(?:é|e|:)\s+[\p{L}][\p{L}\s'-]{1,79}/giu, 'meu nome é [NOME REMOVIDO]')
    .replace(/\b(?:morada|endere[cç]o)\s*[:=]\s*[^\n]{3,120}/gi, '$1: [ENDEREÇO REMOVIDO]');
}

export function respostaIaContemDadosNaoConfirmados(texto) {
  const padroes = [
    /\b\d[\d.,\s]*\s*(?:MZN|MTn?|meticais)\b/i,
    /(?:pre[cç]o|custa|valor).{0,24}\d|\d.{0,24}(?:pre[cç]o|custa|valor)/i,
    /\b\d{1,2}[/:]\d{2}(?::\d{2})?\b/,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
    /\b(?:BIL|SIM|SUP)-[A-Z0-9-]+\b/i,
    /(?:\+?258[\s-]?)?8[2-7](?:[\s-]?\d){7}\b/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\bsk-or-v1-[A-Za-z0-9_-]+\b/i,
    /\+?\d(?:[\s-]?\d){8,14}\b/,
    /\b(?:amanh[ãa]|hoje\s+[àa]s|partida\s+(?:é|ser[aá]|[àa]s))\b/i
  ];
  return padroes.some((padrao) => padrao.test(String(texto)));
}

function respostaBaseDados(mensagem) { return { mensagem, resolveuAutomaticamente: true, origem: 'BASE_DADOS', modelo: null, dadosConfirmados: true }; }
function normalizar(valor) { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function formatarDinheiro(valor) {
  const numero = Number(valor);
  const seguro = Number.isFinite(numero) ? numero : 0;
  return `${new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(seguro)} MT`;
}
function formatarDataHora(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' }).format(new Date(valor)); }
function traduzirEstado(estado) { return { PENDENTE: 'pendente', APROVADO: 'aprovado', REJEITADO: 'rejeitado', REEMBOLSADO: 'reembolsado' }[estado] || String(estado).toLowerCase(); }
