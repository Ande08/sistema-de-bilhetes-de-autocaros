import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPerfil } from '../src/services/utilizador-administracao.service.js';

test('aceita os perfis administrativos permitidos', () => {
  assert.equal(validarPerfil('passageiro'), 'PASSAGEIRO');
  assert.equal(validarPerfil('admin'), 'ADMIN');
});

test('rejeita perfil de utilizador desconhecido', () => {
  assert.throws(() => validarPerfil('gestor'), /PASSAGEIRO ou ADMIN/);
});
