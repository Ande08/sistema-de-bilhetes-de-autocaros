import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { normalizarEnderecoIp } from '../src/services/auditoria.service.js';

test('normaliza endereços IPv4 encapsulados em IPv6', () => {
  assert.equal(normalizarEnderecoIp('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(normalizarEnderecoIp('::ffff:197.235.167.31'), '197.235.167.31');
  assert.equal(normalizarEnderecoIp('::1'), '127.0.0.1');
  assert.equal(normalizarEnderecoIp('2001:db8::1'), '2001:db8::1');
});

test('confia apenas no proxy local para obter o IP encaminhado', () => {
  const confiar = app.get('trust proxy fn');
  assert.equal(confiar('127.0.0.1'), true);
  assert.equal(confiar('::1'), true);
  assert.equal(confiar('197.235.167.31'), false);
});
