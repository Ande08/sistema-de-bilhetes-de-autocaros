import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../src/validacoes/utilizador.validacao.js';

test('normaliza telefone moçambicano antes de guardar ou autenticar', () => {
  assert.equal(normalizarTelefone('84 123 4567'), '+258841234567');
  assert.equal(normalizarTelefone('00258 84 123 4567'), '+258841234567');
});

test('valida os dados obrigatórios do utilizador', () => {
  assert.equal(validarNome('  Ico  '), 'Ico');
  assert.equal(validarApelido('  Tiago Manuel  '), 'Tiago Manuel');
  assert.equal(validarPalavraPasse('segura123'), 'segura123');
});

test('rejeita telefone, nome, apelido e palavra-passe inválidos', () => {
  assert.throws(() => normalizarTelefone('12345'), /telefone moçambicano/);
  assert.throws(() => validarNome('I'), /entre 2 e 80/);
  assert.throws(() => validarApelido('T'), /entre 2 e 120/);
  assert.throws(() => validarPalavraPasse('123'), /pelo menos 8/);
});
