import test from 'node:test';
import assert from 'node:assert/strict';
import { desencriptarSegredo, encriptarSegredo } from '../src/services/segredo.service.js';
import { MODELO_IA_PADRAO, validarDadosConfiguracaoIa } from '../src/services/configuracao-ia.service.js';
import { ocultarDadosSensiveis } from '../src/middlewares/auditoria.middleware.js';

test('cifra a chave da OpenRouter antes de a guardar', () => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'segredo-de-teste-comprido-e-seguro';
  const original = 'sk-or-v1-chave-de-demonstracao';
  const cifrada = encriptarSegredo(original);
  assert.notEqual(cifrada, original);
  assert.equal(cifrada.includes(original), false);
  assert.equal(desencriptarSegredo(cifrada), original);
  if (anterior === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = anterior;
});

test('usa um modelo gratuito da DeepSeek como padrão', () => {
  assert.equal(MODELO_IA_PADRAO, 'deepseek/deepseek-chat:free');
  assert.doesNotThrow(() => validarDadosConfiguracaoIa({ modelo: MODELO_IA_PADRAO, apiKey: 'sk-or-v1-chave-valida-teste' }));
});

test('rejeita modelo e chave com formato inválido', () => {
  assert.throws(() => validarDadosConfiguracaoIa({ modelo: 'modelo sem fornecedor' }), /modelo válido/i);
  assert.throws(() => validarDadosConfiguracaoIa({ modelo: MODELO_IA_PADRAO, apiKey: 'curta' }), /chave/i);
});

test('remove segredos dos dados enviados para auditoria', () => {
  const protegido = ocultarDadosSensiveis({ modelo: MODELO_IA_PADRAO, apiKey: 'segredo', interior: { palavraPasse: 'senha' } });
  assert.equal(protegido.modelo, MODELO_IA_PADRAO);
  assert.equal(protegido.apiKey, '[PROTEGIDO]');
  assert.equal(protegido.interior.palavraPasse, '[PROTEGIDO]');
});
