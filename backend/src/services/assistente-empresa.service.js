import { Op } from 'sequelize';
import { Bilhete, Pagamento, Route, Trip } from '../models/index.js';
import { formatarDinheiro, removerDadosSensiveis } from './dados-assistente.service.js';

// Este assistente é executado localmente: valores financeiros e métricas da
// empresa não são enviados à OpenRouter nem misturados com outras empresas.
export async function obterAnaliseEmpresa(utilizador) {
  garantirAdministradorEmpresa(utilizador);
  const empresaId = utilizador.empresaId;
  const [viagens, bilhetes] = await Promise.all([
    Trip.findAll({ where: { empresaId }, include: [{ model: Route, attributes: ['id', 'origin', 'destination'] }], order: [['departureAt', 'ASC']] }),
    Bilhete.findAll({
      where: { estado: { [Op.ne]: 'CANCELADO' } },
      include: [{ model: Trip, where: { empresaId }, required: true, include: [{ model: Route, attributes: ['id', 'origin', 'destination'] }] }, Pagamento]
    })
  ]);
  const vendasAprovadas = bilhetes.filter((item) => item.Pagamento?.estado === 'APROVADO');
  const volumeAprovado = vendasAprovadas.reduce((total, item) => total + Number(item.Pagamento.valor || 0), 0);
  const porRota = new Map();
  for (const viagem of viagens) {
    const chave = viagem.Route?.id || `sem-rota-${viagem.id}`;
    if (!porRota.has(chave)) porRota.set(chave, { rota: `${viagem.Route?.origin || '—'} → ${viagem.Route?.destination || '—'}`, viagens: 0, bilhetes: 0, volume: 0 });
    porRota.get(chave).viagens += 1;
  }
  for (const bilhete of vendasAprovadas) {
    const chave = bilhete.Trip?.Route?.id || `sem-rota-${bilhete.Trip?.id}`;
    const resumo = porRota.get(chave) || { rota: `${bilhete.Trip?.Route?.origin || '—'} → ${bilhete.Trip?.Route?.destination || '—'}`, viagens: 0, bilhetes: 0, volume: 0 };
    resumo.bilhetes += 1; resumo.volume += Number(bilhete.Pagamento.valor || 0); porRota.set(chave, resumo);
  }
  const rotas = [...porRota.values()].sort((a, b) => b.bilhetes - a.bilhetes || b.volume - a.volume);
  const agora = new Date();
  const futuras = viagens.filter((item) => item.status === 'AGENDADA' && new Date(item.departureAt) > agora);
  const semProcura = rotas.filter((item) => item.viagens >= 2 && item.bilhetes === 0).slice(0, 5);
  const melhores = rotas.filter((item) => item.bilhetes > 0).slice(0, 5);
  return {
    indicadores: {
      viagensAgendadas: futuras.length,
      bilhetesVendidos: vendasAprovadas.length,
      volumeAprovado,
      valorMedio: vendasAprovadas.length ? volumeAprovado / vendasAprovadas.length : 0
    },
    melhoresRotas: melhores,
    rotasSemProcura: semProcura,
    recomendacoes: construirRecomendacoes(melhores, semProcura, futuras.length)
  };
}

export async function perguntarAssistenteEmpresa(utilizador, pergunta) {
  garantirAdministradorEmpresa(utilizador);
  const texto = String(pergunta || '').trim();
  if (texto.length < 3 || texto.length > 1000) throw erroValidacao('Escreva uma pergunta entre 3 e 1000 caracteres.');
  if (removerDadosSensiveis(texto) !== texto) throw erroValidacao('Não inclua telefone, e-mail, palavra-passe, cartão, documento, token ou chave na pergunta.');
  const analise = await obterAnaliseEmpresa(utilizador);
  return responderPerguntaComAnalise(texto, analise);
}

// A geração da resposta fica separada da leitura da base de dados. Além de
// simplificar os testes, isto impede que o texto da pergunta altere o escopo
// empresarial usado para recolher as métricas.
export function responderPerguntaComAnalise(pergunta, analise) {
  const texto = String(pergunta || '').trim();
  const normalizada = normalizar(texto);
  let resposta;
  if (/lucro|custo|despesa|margem/.test(normalizada)) {
    resposta = `O sistema confirma ${formatarDinheiro(analise.indicadores.volumeAprovado)} em pagamentos aprovados, mas não regista custos ou despesas da empresa. Por isso, não é seguro calcular lucro ou margem. Use o volume confirmado e compare-o com a contabilidade interna.`;
  } else if (/finance|receita|volume|venda|dinheiro|fatur|factur|rendimento|total/.test(normalizada)) {
    resposta = `A empresa possui ${analise.indicadores.bilhetesVendidos} pagamentos aprovados, com volume total de ${formatarDinheiro(analise.indicadores.volumeAprovado)} e valor médio de ${formatarDinheiro(analise.indicadores.valorMedio)} por bilhete.`;
  } else if (/campanha|cupao|cupom|promoc|marketing/.test(normalizada)) {
    resposta = analise.rotasSemProcura.length
      ? `Priorize campanhas nas rotas ${analise.rotasSemProcura.map((item) => item.rota).join(', ')}, pois possuem partidas mas ainda não registam vendas aprovadas. Considere cupões com validade curta e limite de utilizações.`
      : `Não existem rotas recorrentes totalmente sem procura neste conjunto de dados. Considere campanhas nas rotas com menor número de bilhetes e acompanhe os resultados antes de aumentar o desconto.`;
  } else if (/mais viagem|mais procura|melhor rota|popular|destino/.test(normalizada)) {
    resposta = analise.melhoresRotas.length
      ? `As rotas com maior procura são: ${analise.melhoresRotas.map((item) => `${item.rota} (${item.bilhetes} bilhetes)`).join('; ')}.`
      : 'Ainda não existem vendas aprovadas suficientes para identificar as rotas com maior procura.';
  } else {
    resposta = `${analise.recomendacoes.join(' ')} Pode perguntar sobre volume financeiro, rotas com mais procura ou campanhas recomendadas.`;
  }
  return { resposta, analise, origem: 'ANALISE_LOCAL', escopo: 'EMPRESA_ACTUAL' };
}

function construirRecomendacoes(melhores, semProcura, futuras) {
  const itens = [];
  if (melhores[0]) itens.push(`A rota ${melhores[0].rota} lidera a procura com ${melhores[0].bilhetes} bilhetes aprovados.`);
  if (semProcura[0]) itens.push(`Avalie uma campanha para ${semProcura[0].rota}, que possui partidas e ainda não tem vendas aprovadas.`);
  if (!futuras) itens.push('Agende novas viagens futuras para manter a empresa visível na pesquisa dos clientes.');
  if (!itens.length) itens.push('Continue a recolher vendas para que o sistema produza recomendações mais precisas.');
  return itens;
}

function garantirAdministradorEmpresa(utilizador) {
  if (utilizador?.perfil !== 'EMPRESA_ADMIN' || !utilizador.empresaId) {
    const erro = new Error('O assistente analítico está disponível apenas para administradores de empresa.'); erro.statusCode = 403; throw erro;
  }
}
function normalizar(valor) { return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
