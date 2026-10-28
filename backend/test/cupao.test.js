import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularValoresCupao, normalizarCodigoCupao, validarDadosCupao } from '../src/services/cupao.service.js';

test('normaliza e valida o código do cupom', () => {
  assert.equal(normalizarCodigoCupao(' ferias-10 '), 'FERIAS-10');
  assert.throws(() => normalizarCodigoCupao('x!'), /código/);
});

test('valida percentagem, validade e limites do cupom', () => {
  const dados = validarDadosCupao({
    codigo: 'CLIENTE20', percentagem: 20,
    validoDe: '2027-01-01T00:00:00Z', validoAte: '2027-02-01T00:00:00Z',
    valorMinimo: 500, limiteUtilizacoes: 100, limitePorUtilizador: 2
  });
  assert.equal(dados.percentagem, 20);
  assert.equal(dados.limiteUtilizacoes, 100);
  assert.equal(dados.limitePorUtilizador, 2);
});

test('rejeita desconto total e intervalo de validade invertido', () => {
  assert.throws(() => validarDadosCupao({
    codigo: 'GRATIS100', percentagem: 100,
    validoDe: '2027-02-01', validoAte: '2027-01-01'
  }), /percentagem/);
});

test('calcula e arredonda o desconto em meticais', () => {
  assert.deepEqual(calcularValoresCupao(1250, 15), {
    precoOriginal: 1250, desconto: 187.5, valorFinal: 1062.5
  });
});
