import test from 'node:test';
import assert from 'node:assert/strict';
import { exigirAdministrador, exigirAtendenteOuAdministrador } from '../src/middlewares/autorizacao.middleware.js';

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

test('permite que o atendente aceda às vendas operacionais', () => {
  let chamado = false;
  exigirAtendenteOuAdministrador({ utilizador: { perfil: 'GESTOR_SUPORTE' } }, {}, () => { chamado = true; });
  assert.equal(chamado, true);
});

test('impede que o cliente aceda às vendas operacionais', () => {
  let erro;
  exigirAtendenteOuAdministrador({ utilizador: { perfil: 'PASSAGEIRO' } }, {}, (valor) => { erro = valor; });
  assert.equal(erro.statusCode, 403);
});
