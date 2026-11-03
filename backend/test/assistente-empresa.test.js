import test from 'node:test';
import assert from 'node:assert/strict';
import { responderPerguntaComAnalise } from '../src/services/assistente-empresa.service.js';

const analise = {
  indicadores: { bilhetesVendidos: 8, volumeAprovado: 12000, valorMedio: 1500 },
  melhoresRotas: [{ rota: 'Maputo → Xai-Xai', bilhetes: 6, viagens: 3, volume: 9000 }],
  rotasSemProcura: [{ rota: 'Maputo → Chókwè', bilhetes: 0, viagens: 2, volume: 0 }],
  recomendacoes: ['Avalie uma campanha para Maputo → Chókwè.']
};

test('responde sobre finanças apenas com valores confirmados da empresa', () => {
  const resultado = responderPerguntaComAnalise('Qual é o volume de vendas?', analise);
  assert.match(resultado.resposta, /8 pagamentos aprovados/);
  assert.match(resultado.resposta, /12[\s\u00a0]?000,00 MT/);
  assert.equal(resultado.escopo, 'EMPRESA_ACTUAL');
  assert.equal(resultado.origem, 'ANALISE_LOCAL');
});

test('não inventa lucro quando o sistema não possui custos', () => {
  const resultado = responderPerguntaComAnalise('Qual foi o nosso lucro e margem?', analise);
  assert.match(resultado.resposta, /não regista custos ou despesas/i);
  assert.match(resultado.resposta, /não é seguro calcular lucro ou margem/i);
});

test('recomenda campanhas com base nas rotas sem procura', () => {
  const resultado = responderPerguntaComAnalise('Onde devo fazer uma campanha?', analise);
  assert.match(resultado.resposta, /Maputo → Chókwè/);
  assert.match(resultado.resposta, /validade curta/i);
});

test('identifica as rotas com maior procura sem consultar dados externos', () => {
  const resultado = responderPerguntaComAnalise('Qual é a rota mais popular?', analise);
  assert.match(resultado.resposta, /Maputo → Xai-Xai \(6 bilhetes\)/);
  assert.equal(resultado.analise, analise);
});
