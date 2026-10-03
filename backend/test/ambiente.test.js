import test from 'node:test';
import assert from 'node:assert/strict';
import { validarVariaveisAmbiente } from '../src/config/validar-ambiente.js';

const nomes = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];

function comAmbiente(valores, executar) {
  const anteriores = Object.fromEntries(nomes.map((nome) => [nome, process.env[nome]]));
  Object.assign(process.env, valores);
  try {
    executar();
  } finally {
    nomes.forEach((nome) => anteriores[nome] === undefined ? delete process.env[nome] : process.env[nome] = anteriores[nome]);
  }
}

test('aceita as variáveis obrigatórias configuradas', () => {
  comAmbiente({ DB_HOST: 'localhost', DB_NAME: 'teste', DB_USER: 'root', JWT_SECRET: 'chave-segura-de-teste' }, () => {
    assert.doesNotThrow(() => validarVariaveisAmbiente());
  });
});

test('rejeita variável obrigatória ausente', () => {
  comAmbiente({ DB_HOST: 'localhost', DB_NAME: 'teste', DB_USER: 'root', JWT_SECRET: '' }, () => {
    assert.throws(() => validarVariaveisAmbiente(), /JWT_SECRET/);
  });
});

test('rejeita a chave JWT do ficheiro de exemplo', () => {
  comAmbiente({ DB_HOST: 'localhost', DB_NAME: 'teste', DB_USER: 'root', JWT_SECRET: 'alterar_esta_chave' }, () => {
    assert.throws(() => validarVariaveisAmbiente(), /chave segura/);
  });
});
