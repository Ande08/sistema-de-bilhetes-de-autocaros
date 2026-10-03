import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEmail, validarEmail, validarNome, validarPalavraPasse } from '../src/validacoes/utilizador.validacao.js';

test('normaliza email antes de guardar ou autenticar', () => {
  assert.equal(normalizarEmail('  Passageiro@Exemplo.COM '), 'passageiro@exemplo.com');
});

test('valida os dados obrigatórios do utilizador', () => {
  assert.equal(validarNome('  Ico   Tiago  '), 'Ico Tiago');
  assert.equal(validarEmail('ico@exemplo.com'), 'ico@exemplo.com');
  assert.equal(validarPalavraPasse('segura123'), 'segura123');
});

test('rejeita email, nome e palavra-passe inválidos', () => {
  assert.throws(() => validarEmail('email-invalido'), /email válido/);
  assert.throws(() => validarNome('I'), /entre 3 e 120/);
  assert.throws(() => validarPalavraPasse('123'), /pelo menos 8/);
});
