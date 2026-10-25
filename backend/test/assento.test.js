import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarMapaAssentos, ordenarAssentosNumericamente } from '../src/services/assento.service.js';

test('ordena os números dos assentos de forma natural', () => {
  const assentos = [{ numero: '1' }, { numero: '10' }, { numero: '2' }, { numero: '11' }];
  const ordenados = ordenarAssentosNumericamente(assentos);
  assert.deepEqual(ordenados.map((item) => item.numero), ['1', '2', '10', '11']);
});

test('gera uma distribuição 2+2 com corredor e lugares de janela', () => {
  const assentos = gerarMapaAssentos(8, 2, 2);
  assert.deepEqual(assentos.map(({ fila, lado, juntoJanela }) => ({ fila, lado, juntoJanela })), [
    { fila: 1, lado: 'ESQUERDO', juntoJanela: true },
    { fila: 1, lado: 'ESQUERDO', juntoJanela: false },
    { fila: 1, lado: 'DIREITO', juntoJanela: false },
    { fila: 1, lado: 'DIREITO', juntoJanela: true },
    { fila: 2, lado: 'ESQUERDO', juntoJanela: true },
    { fila: 2, lado: 'ESQUERDO', juntoJanela: false },
    { fila: 2, lado: 'DIREITO', juntoJanela: false },
    { fila: 2, lado: 'DIREITO', juntoJanela: true }
  ]);
});

test('respeita uma distribuição assimétrica 2+1', () => {
  const assentos = gerarMapaAssentos(5, 2, 1);
  assert.deepEqual(assentos.map((item) => [item.numero, item.fila, item.lado, item.juntoJanela]), [
    ['1', 1, 'ESQUERDO', true], ['2', 1, 'ESQUERDO', false], ['3', 1, 'DIREITO', true],
    ['4', 2, 'ESQUERDO', true], ['5', 2, 'ESQUERDO', false]
  ]);
});
