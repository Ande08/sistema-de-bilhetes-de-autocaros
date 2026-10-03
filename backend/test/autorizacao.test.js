import test from 'node:test';
import assert from 'node:assert/strict';
import { exigirAdministrador } from '../src/middlewares/autorizacao.middleware.js';

test('permite acesso ao administrador', () => {
  let chamado = false;
  exigirAdministrador({ utilizador: { perfil: 'ADMIN' } }, {}, () => { chamado = true; });
  assert.equal(chamado, true);
});

test('bloqueia acesso ao passageiro', () => {
  let erro;
  exigirAdministrador({ utilizador: { perfil: 'PASSAGEIRO' } }, {}, (valor) => { erro = valor; });
  assert.equal(erro.statusCode, 403);
});
