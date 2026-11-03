import test from 'node:test';
import assert from 'node:assert/strict';
import { construirResultadoValidacao } from '../src/services/validacao-bilhete.service.js';

function registo(estadoBilhete = 'EMITIDO', estadoViagem = 'AGENDADA', estadoPagamento = 'APROVADO') {
  return {
    codigo: 'BIL-VALIDO-001', estado: estadoBilhete, createdAt: '2026-11-03T10:00:00Z', nomePassageiro: 'Não deve aparecer', preco: 1200,
    Pagamento: { estado: estadoPagamento, referencia: 'SEGREDO' },
    Assento: { numero: 'A1', juntoJanela: true },
    Trip: {
      id: 8, status: estadoViagem, departureAt: '2026-11-10T08:00:00+02:00',
      Route: { origin: 'Maputo', originProvince: 'Maputo Cidade', destination: 'Beira', destinationProvince: 'Sofala' },
      Empresa: { nome: 'Transportes Teste', slug: 'transportes-teste', logoUrl: '/ficheiros/empresas/logo.png' }
    }
  };
}

test('confirma um bilhete emitido de viagem agendada', () => {
  const resultado = construirResultadoValidacao(registo());
  assert.equal(resultado.autentico, true);
  assert.equal(resultado.validoParaEmbarque, true);
  assert.equal(resultado.situacao.codigo, 'VALIDO');
  assert.equal(resultado.viagem.origem, 'Maputo');
  assert.equal(resultado.assento.numero, 'A1');
});

test('reconhece autenticidade sem aceitar bilhete cancelado ou utilizado', () => {
  const cancelado = construirResultadoValidacao(registo('CANCELADO'));
  const utilizado = construirResultadoValidacao(registo('UTILIZADO'));
  assert.equal(cancelado.autentico, true);
  assert.equal(cancelado.validoParaEmbarque, false);
  assert.equal(cancelado.situacao.codigo, 'CANCELADO');
  assert.equal(utilizado.situacao.codigo, 'UTILIZADO');
});

test('não expõe dados pessoais nem referência de pagamento', () => {
  const texto = JSON.stringify(construirResultadoValidacao(registo()));
  assert.doesNotMatch(texto, /Não deve aparecer|SEGREDO|preco|referencia/i);
});
