import { existsSync } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { Op } from 'sequelize';
import { Bilhete, Empresa, Pagamento, Route, Trip } from '../models/index.js';
import { directorioLogotiposEmpresas } from './logotipo-empresa.service.js';

const AZUL_ESCURO = '#06396F';
const AZUL = '#0875D7';
const AZUL_CLARO = '#E9F5FF';
const TEXTO = '#153F67';
const TEXTO_SUAVE = '#607D96';
const BORDA = '#B9D8ED';

// Recolhe somente pagamentos aprovados ligados a viagens da empresa
// autenticada. O período máximo reduz consultas excessivas e relatórios
// acidentalmente gigantes.
export async function obterDadosRelatorioFinanceiro(utilizador, filtros = {}) {
  garantirAdministradorEmpresa(utilizador);
  const periodo = validarPeriodo(filtros);
  const periodoAnterior = calcularPeriodoAnterior(periodo);
  const [empresa, pagamentos, pagamentosAnteriores] = await Promise.all([
    Empresa.findByPk(utilizador.empresaId, { attributes: ['id', 'nome', 'telefone', 'website', 'logoUrl'] }),
    consultarPagamentosEmpresa(utilizador.empresaId, periodo),
    consultarPagamentosEmpresa(utilizador.empresaId, periodoAnterior)
  ]);
  if (!empresa) throw Object.assign(new Error('Empresa não encontrada.'), { statusCode: 404 });
  return construirResumoFinanceiro({ empresa: empresa.toJSON(), pagamentos, pagamentosAnteriores, periodo, periodoAnterior });
}

export function construirResumoFinanceiro({ empresa, pagamentos, pagamentosAnteriores = [], periodo, periodoAnterior = calcularPeriodoAnterior(periodo) }) {
  const movimentos = pagamentos.map(construirMovimento);
  const movimentosAnteriores = pagamentosAnteriores.map(construirMovimento);
  const volumeAprovado = somar(movimentos, 'valor');
  const volumeAnterior = somar(movimentosAnteriores, 'valor');
  const descontos = somar(movimentos, 'desconto');
  const valorBruto = volumeAprovado + descontos;
  const diasPeriodo = Math.max(1, Math.round((periodo.fim.getTime() - periodo.inicio.getTime()) / 86400000) + 1);
  const diasComVendas = new Set(movimentos.map((item) => chaveDataMaputo(item.data))).size;
  const rotas = agruparResumo(movimentos, (item) => item.rota, 'rota', 'bilhetes');
  const metodos = agruparResumo(movimentos, (item) => item.metodo, 'metodo', 'transacoes');
  const diasSemana = agruparResumo(movimentos, (item) => obterDiaSemana(item.partida || item.data), 'dia', 'bilhetes');
  const faixasHorarias = agruparResumo(movimentos, (item) => obterFaixaHoraria(item.partida || item.data), 'faixa', 'bilhetes');
  const indicadores = {
    pagamentosAprovados: movimentos.length,
    volumeAprovado,
    valorMedio: movimentos.length ? volumeAprovado / movimentos.length : 0,
    descontos,
    valorBruto,
    taxaDesconto: valorBruto ? (descontos / valorBruto) * 100 : 0,
    mediaDiaria: volumeAprovado / diasPeriodo,
    diasComVendas,
    volumeAnterior,
    pagamentosAnteriores: movimentosAnteriores.length,
    crescimentoVolume: calcularVariacao(volumeAprovado, volumeAnterior),
    crescimentoPagamentos: calcularVariacao(movimentos.length, movimentosAnteriores.length),
    concentracaoMelhorRota: volumeAprovado && rotas[0] ? (rotas[0].volume / volumeAprovado) * 100 : 0
  };
  return {
    empresa,
    periodo,
    periodoAnterior,
    indicadores,
    rotas,
    metodos,
    diasSemana,
    faixasHorarias,
    movimentos,
    recomendacoes: construirRecomendacoesFinanceiras({ rotas, diasSemana, faixasHorarias, indicadores })
  };
}

function construirMovimento(pagamento) {
    const bilhete = pagamento.Bilhete || pagamento.bilhete || {};
    const viagem = bilhete.Trip || bilhete.viagem || {};
    const rota = viagem.Route || viagem.rota || {};
    return {
      data: pagamento.criado_em || pagamento.createdAt,
      partida: viagem.departureAt,
      referencia: pagamento.referencia,
      metodo: pagamento.metodo,
      bilhete: bilhete.codigo || '-',
      rota: `${rota.origin || '-'} -> ${rota.destination || '-'}`,
      valor: Number(pagamento.valor || 0),
      desconto: Number(bilhete.desconto || 0)
    };
}

export async function gerarRelatorioFinanceiroPdf(dados) {
  const documento = new PDFDocument({ size: 'A4', margins: { top: 46, right: 46, bottom: 48, left: 46 }, bufferPages: true, info: { Title: `Relatório financeiro - ${dados.empresa.nome}`, Author: dados.empresa.nome } });
  const partes = [];
  documento.on('data', (parte) => partes.push(parte));
  const concluido = new Promise((resolve, reject) => {
    documento.on('end', () => resolve(Buffer.concat(partes)));
    documento.on('error', reject);
  });

  desenharCabecalho(documento, dados);
  desenharIndicadores(documento, dados.indicadores);
  desenharTabelaResumo(documento, 'Indicadores para tomada de decisão', ['Indicador', 'Resultado'], construirLinhasDecisao(dados), [335, 168]);
  desenharTabelaResumo(documento, 'Desempenho por rota', ['Rota', 'Bilhetes', 'Volume'], dados.rotas.map((item) => [item.rota, String(item.bilhetes), formatarMeticais(item.volume)]), [285, 70, 130]);
  desenharTabelaResumo(documento, 'Meios de pagamento', ['Método', 'Transações', 'Volume'], dados.metodos.map((item) => [traduzirMetodo(item.metodo), String(item.transacoes), formatarMeticais(item.volume)]), [285, 70, 130]);
  desenharTabelaResumo(documento, 'Procura por dia de partida', ['Dia', 'Bilhetes', 'Volume'], dados.diasSemana.map((item) => [item.dia, String(item.bilhetes), formatarMeticais(item.volume)]), [285, 70, 130]);
  desenharTabelaResumo(documento, 'Procura por horário de partida', ['Faixa', 'Bilhetes', 'Volume'], dados.faixasHorarias.map((item) => [item.faixa, String(item.bilhetes), formatarMeticais(item.volume)]), [285, 70, 130]);
  desenharRecomendacoes(documento, dados.recomendacoes);
  desenharMovimentos(documento, dados.movimentos);
  adicionarRodapes(documento, dados);
  documento.end();
  return concluido;
}

function desenharCabecalho(documento, dados) {
  documento.save().rect(0, 0, documento.page.width, 128).fill(AZUL_ESCURO).restore();
  // `logoBuffer` é usado apenas por testes e pré-visualizações. Em produção o
  // logótipo é sempre resolvido na pasta privada de ficheiros da empresa.
  const logo = dados.logoBuffer || resolverLogotipo(dados.empresa.logoUrl);
  let logoDesenhado = false;
  const inicioTexto = 134;
  documento.save().roundedRect(46, 27, 72, 72, 12).fill('#FFFFFF').restore();
  if (logo) {
    try {
      documento.image(logo, 53, 34, { fit: [58, 58], align: 'center', valign: 'center' });
      logoDesenhado = true;
    } catch { logoDesenhado = false; }
  }
  if (!logoDesenhado) {
    const iniciais = String(dados.empresa.nome || 'VB').split(/\s+/).slice(0, 2).map((item) => item[0]).join('').toUpperCase();
    documento.font('Helvetica-Bold').fontSize(22).fillColor(AZUL).text(iniciais, 46, 50, { width: 72, align: 'center', lineBreak: false });
  }
  documento.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(dados.empresa.nome, inicioTexto, 35, { width: 415 - (inicioTexto - 46) });
  documento.font('Helvetica').fontSize(10).fillColor('#D8EDFF').text('RELATÓRIO FINANCEIRO', inicioTexto, 64);
  documento.fontSize(9).text(`Período: ${formatarData(dados.periodo.inicio)} a ${formatarData(dados.periodo.fim)}`, inicioTexto, 82);
  documento.fillColor(TEXTO).font('Helvetica-Bold').fontSize(15).text('Resumo do período', 46, 151);
  documento.font('Helvetica').fontSize(8).fillColor(TEXTO_SUAVE).text(`Gerado em ${formatarDataHora(new Date())}. Valores apresentados em meticais (MT).`, 46, 173);
  documento.y = 197;
}

function desenharIndicadores(documento, indicadores) {
  const itens = [
    ['PAGAMENTOS APROVADOS', String(indicadores.pagamentosAprovados)],
    ['VOLUME APROVADO', formatarMeticais(indicadores.volumeAprovado)],
    ['VALOR MÉDIO', formatarMeticais(indicadores.valorMedio)],
    ['DESCONTOS CONCEDIDOS', formatarMeticais(indicadores.descontos)]
  ];
  const largura = 117;
  const y = documento.y;
  itens.forEach(([rotulo, valor], indice) => {
    const x = 46 + indice * 126;
    documento.save().roundedRect(x, y, largura, 64, 9).fill(AZUL_CLARO).restore();
    documento.font('Helvetica').fontSize(7).fillColor(TEXTO_SUAVE).text(rotulo, x + 10, y + 11, { width: largura - 20 });
    documento.font('Helvetica-Bold').fontSize(11).fillColor(AZUL_ESCURO).text(valor, x + 10, y + 33, { width: largura - 20 });
  });
  documento.y = y + 84;
}

function desenharTabelaResumo(documento, titulo, cabecalhos, linhas, larguras) {
  const linhasSeguras = linhas.length ? linhas : [cabecalhos.map((_, indice) => indice ? '-' : 'Sem dados no período')];
  garantirEspaco(documento, 70);
  tituloSecao(documento, titulo);
  desenharCabecalhoTabela(documento, cabecalhos, larguras);
  for (const linha of linhasSeguras) {
    garantirEspaco(documento, 26, () => desenharCabecalhoTabela(documento, cabecalhos, larguras));
    desenharLinhaTabela(documento, linha, larguras);
  }
  documento.y += 15;
}

function desenharRecomendacoes(documento, recomendacoes) {
  garantirEspaco(documento, 85);
  tituloSecao(documento, 'Notas analíticas');
  for (const recomendacao of recomendacoes) {
    garantirEspaco(documento, 34);
    const y = documento.y;
    documento.save().roundedRect(46, y, 503, 28, 6).fill('#F3F9FE').restore();
    documento.circle(58, y + 14, 3).fill(AZUL);
    documento.font('Helvetica').fontSize(8.5).fillColor(TEXTO).text(recomendacao, 69, y + 8, { width: 466 });
    documento.y = y + 35;
  }
  documento.y += 5;
}

function desenharMovimentos(documento, movimentos) {
  // Evita deixar apenas uma linha da tabela numa página nova quando todo o
  // bloco de movimentos ainda cabe junto na página seguinte.
  garantirEspaco(documento, 50 + Math.min(movimentos.length, 8) * 24);
  tituloSecao(documento, 'Movimentos aprovados');
  const cabecalhos = ['Data', 'Bilhete', 'Rota', 'Método', 'Valor'];
  const larguras = [65, 88, 184, 72, 94];
  desenharCabecalhoTabela(documento, cabecalhos, larguras);
  if (!movimentos.length) desenharLinhaTabela(documento, ['Sem movimentos', '-', '-', '-', '-'], larguras);
  for (const item of movimentos) {
    garantirEspaco(documento, 26, () => desenharCabecalhoTabela(documento, cabecalhos, larguras));
    desenharLinhaTabela(documento, [formatarData(item.data), item.bilhete, item.rota, traduzirMetodo(item.metodo), formatarMeticais(item.valor)], larguras);
  }
}

function tituloSecao(documento, titulo) {
  documento.font('Helvetica-Bold').fontSize(12).fillColor(AZUL_ESCURO).text(titulo, 46, documento.y);
  documento.moveDown(0.6);
}

function desenharCabecalhoTabela(documento, cabecalhos, larguras) {
  const y = documento.y;
  documento.save().rect(46, y, somarLarguras(larguras), 22).fill(AZUL_ESCURO).restore();
  let x = 46;
  cabecalhos.forEach((texto, indice) => {
    documento.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF').text(texto.toUpperCase(), x + 6, y + 7, { width: larguras[indice] - 12, lineBreak: false, ellipsis: true });
    x += larguras[indice];
  });
  documento.y = y + 22;
}

function desenharLinhaTabela(documento, valores, larguras) {
  const y = documento.y;
  documento.save().rect(46, y, somarLarguras(larguras), 24).fill(y % 2 ? '#FFFFFF' : '#F6FAFD').stroke(BORDA).restore();
  let x = 46;
  valores.forEach((valor, indice) => {
    documento.font('Helvetica').fontSize(7.3).fillColor(TEXTO).text(String(valor ?? '-'), x + 6, y + 8, { width: larguras[indice] - 12, lineBreak: false, ellipsis: true });
    x += larguras[indice];
  });
  documento.y = y + 24;
}

function garantirEspaco(documento, altura, aoAdicionarPagina) {
  // Reserva uma faixa fixa para o rodapé, evitando que o PDFKit crie páginas
  // adicionais ao escrever a numeração.
  if (documento.y + altura <= documento.page.height - 90) return;
  documento.addPage();
  documento.y = 46;
  if (aoAdicionarPagina) aoAdicionarPagina();
}

function adicionarRodapes(documento, dados) {
  const intervalo = documento.bufferedPageRange();
  for (let indice = 0; indice < intervalo.count; indice += 1) {
    documento.switchToPage(indice);
    const yLinha = documento.page.height - 73;
    const yTexto = documento.page.height - 64;
    documento.save().moveTo(46, yLinha).lineTo(documento.page.width - 46, yLinha).strokeColor(BORDA).stroke().restore();
    documento.font('Helvetica').fontSize(7).fillColor(TEXTO_SUAVE).text(`${dados.empresa.nome} - relatório confidencial`, 46, yTexto, { lineBreak: false });
    documento.text(`Página ${indice + 1} de ${intervalo.count}`, documento.page.width - 146, yTexto, { width: 100, align: 'right', lineBreak: false });
  }
}

function validarPeriodo({ inicio, fim }) {
  const agora = new Date();
  const inicioPadrao = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const dataInicio = inicio ? dataMaputo(inicio, false) : inicioPadrao;
  const dataFim = fim ? dataMaputo(fim, true) : agora;
  if (!dataInicio || !dataFim || dataInicio > dataFim) throw Object.assign(new Error('Selecione um período financeiro válido.'), { statusCode: 400 });
  if (dataFim.getTime() - dataInicio.getTime() > 366 * 24 * 60 * 60 * 1000) throw Object.assign(new Error('O relatório pode abranger no máximo 366 dias.'), { statusCode: 400 });
  return { inicio: dataInicio, fim: dataFim };
}

async function consultarPagamentosEmpresa(empresaId, periodo) {
  return Pagamento.findAll({
    where: { estado: 'APROVADO', criado_em: { [Op.between]: [periodo.inicio, periodo.fim] } },
    include: [{
      model: Bilhete,
      required: true,
      attributes: ['id', 'codigo', 'preco', 'precoOriginal', 'desconto'],
      include: [{
        model: Trip,
        required: true,
        where: { empresaId },
        attributes: ['id', 'departureAt'],
        include: [{ model: Route, attributes: ['id', 'origin', 'destination'] }]
      }]
    }],
    order: [['criado_em', 'ASC']]
  });
}

function calcularPeriodoAnterior(periodo) {
  const duracao = periodo.fim.getTime() - periodo.inicio.getTime();
  const fim = new Date(periodo.inicio.getTime() - 1);
  return { inicio: new Date(fim.getTime() - duracao), fim };
}

function dataMaputo(valor, fimDoDia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) return null;
  const data = new Date(`${valor}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}+02:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function resolverLogotipo(logoUrl) {
  if (!logoUrl?.startsWith('/ficheiros/empresas/')) return null;
  const caminho = path.join(directorioLogotiposEmpresas, path.basename(logoUrl));
  return existsSync(caminho) ? caminho : null;
}

function construirRecomendacoesFinanceiras({ rotas, diasSemana, faixasHorarias, indicadores }) {
  if (!indicadores.pagamentosAprovados) return ['Não existem pagamentos aprovados no período selecionado.', 'Considere rever a oferta de viagens e campanhas antes do próximo período.'];
  const itens = [`Foram confirmados ${indicadores.pagamentosAprovados} pagamentos, com média diária de ${formatarMeticais(indicadores.mediaDiaria)}.`];
  if (rotas[0]) itens.push(`A rota ${rotas[0].rota} concentra ${formatarPercentagem(indicadores.concentracaoMelhorRota)} do volume; avalie capacidade, frequência e campanhas nesta ligação.`);
  if (diasSemana[0] && faixasHorarias[0]) itens.push(`A maior procura ocorreu em ${diasSemana[0].dia}, sobretudo na faixa ${faixasHorarias[0].faixa}; priorize frota e comunicação nesse período.`);
  if (indicadores.crescimentoVolume !== null && indicadores.crescimentoVolume >= 10) itens.push(`O volume cresceu ${formatarPercentagem(indicadores.crescimentoVolume)} face ao período anterior; valide se há procura suficiente para reforçar as viagens mais vendidas.`);
  if (indicadores.crescimentoVolume !== null && indicadores.crescimentoVolume < 0) itens.push(`O volume recuou ${formatarPercentagem(Math.abs(indicadores.crescimentoVolume))} face ao período anterior; considere campanhas segmentadas nas rotas e horários com menor procura.`);
  if (indicadores.taxaDesconto >= 10) itens.push(`Os descontos representam ${formatarPercentagem(indicadores.taxaDesconto)} do valor bruto; confirme se os cupões estão a gerar volume sem comprometer a margem operacional.`);
  itens.push('O relatório apresenta volume de vendas, não lucro: custos e despesas da empresa não estão registados no sistema.');
  return itens;
}

function construirLinhasDecisao(dados) {
  const { indicadores } = dados;
  return [
    ['Período anterior comparável', `${formatarData(dados.periodoAnterior.inicio)} a ${formatarData(dados.periodoAnterior.fim)}`],
    ['Variação do volume', indicadores.crescimentoVolume === null ? 'Sem base anterior' : formatarVariacao(indicadores.crescimentoVolume)],
    ['Variação dos pagamentos', indicadores.crescimentoPagamentos === null ? 'Sem base anterior' : formatarVariacao(indicadores.crescimentoPagamentos)],
    ['Média diária de vendas', formatarMeticais(indicadores.mediaDiaria)],
    ['Dias com vendas', String(indicadores.diasComVendas)],
    ['Valor antes dos descontos', formatarMeticais(indicadores.valorBruto)],
    ['Peso dos descontos', formatarPercentagem(indicadores.taxaDesconto)],
    ['Concentração da melhor rota', formatarPercentagem(indicadores.concentracaoMelhorRota)]
  ];
}

function garantirAdministradorEmpresa(utilizador) {
  if (utilizador?.perfil !== 'EMPRESA_ADMIN' || !utilizador.empresaId) throw Object.assign(new Error('Relatório disponível apenas para administradores de empresa.'), { statusCode: 403 });
}

function agrupar(itens, obterChave) {
  const grupos = new Map();
  for (const item of itens) { const chave = obterChave(item); grupos.set(chave, [...(grupos.get(chave) || []), item]); }
  return [...grupos.entries()];
}
function agruparResumo(itens, obterChave, nomeChave, nomeQuantidade) {
  return agrupar(itens, obterChave).map(([chave, grupo]) => ({
    [nomeChave]: chave,
    [nomeQuantidade]: grupo.length,
    volume: somar(grupo, 'valor')
  })).sort((a, b) => b.volume - a.volume);
}
function calcularVariacao(actual, anterior) { return anterior ? ((actual - anterior) / anterior) * 100 : null; }
function chaveDataMaputo(valor) { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Maputo' }).format(new Date(valor)); }
function obterDiaSemana(valor) {
  const texto = new Intl.DateTimeFormat('pt-MZ', { weekday: 'long', timeZone: 'Africa/Maputo' }).format(new Date(valor));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function obterFaixaHoraria(valor) {
  const hora = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Maputo' }).format(new Date(valor)));
  if (hora < 6) return 'Madrugada (00h-05h)';
  if (hora < 12) return 'Manhã (06h-11h)';
  if (hora < 18) return 'Tarde (12h-17h)';
  return 'Noite (18h-23h)';
}
function somar(itens, campo) { return itens.reduce((total, item) => total + Number(item[campo] || 0), 0); }
function somarLarguras(larguras) { return larguras.reduce((total, largura) => total + largura, 0); }
function formatarMeticais(valor) { return `${Number(valor || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`; }
function formatarData(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeZone: 'Africa/Maputo' }).format(new Date(valor)); }
function formatarDataHora(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maputo' }).format(new Date(valor)); }
function formatarPercentagem(valor) { return `${Number(valor || 0).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`; }
function formatarVariacao(valor) { return `${valor >= 0 ? '+' : ''}${formatarPercentagem(valor)}`; }
function traduzirMetodo(metodo) { return { MPESA: 'M-Pesa', EMOLA: 'e-Mola', CARTAO: 'Cartão' }[metodo] || metodo || '-'; }
