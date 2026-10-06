import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarAssentosNumericamente } from '../src/services/assento.service.js';

test('ordena os números dos assentos de forma natural', () => {
  const assentos = [{ numero: '1' }, { numero: '10' }, { numero: '2' }, { numero: '11' }];
  const ordenados = ordenarAssentosNumericamente(assentos);
  assert.deepEqual(ordenados.map((item) => item.numero), ['1', '2', '10', '11']);
});
