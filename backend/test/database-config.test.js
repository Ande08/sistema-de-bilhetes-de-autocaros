import test from 'node:test';
import assert from 'node:assert/strict';
import { numeroLimitado, obterLimitesBaseDados } from '../src/config/database.js';

test('limita números configuráveis à faixa autorizada', () => {
  assert.equal(numeroLimitado('8', 5, 1, 20), 8);
  assert.equal(numeroLimitado('999', 5, 1, 20), 20);
  assert.equal(numeroLimitado('-2', 5, 1, 20), 1);
  assert.equal(numeroLimitado('inválido', 5, 1, 20), 5);
});

test('protege o MySQL com limites conservadores por padrão', () => {
  const limites = obterLimitesBaseDados({});
  assert.equal(limites.maxPreparedStatements, 250);
  assert.deepEqual(limites.pool, { max: 5, min: 0, acquire: 30000, idle: 10000 });
});

test('limita prepared statements e ligações definidos pelo ambiente', () => {
  const limites = obterLimitesBaseDados({
    DB_MAX_PREPARED_STATEMENTS_PER_CONNECTION: '50000',
    DB_POOL_MAX: '100'
  });
  assert.equal(limites.maxPreparedStatements, 2000);
  assert.equal(limites.pool.max, 20);
});
