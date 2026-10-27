import test from 'node:test';
import assert from 'node:assert/strict';
import { validarDadosEmpresa } from '../src/services/empresa-perfil.service.js';
import { guardarLogotipoEmpresa } from '../src/services/logotipo-empresa.service.js';

test('valida e normaliza os dados editáveis da empresa', () => {
  const dados = validarDadosEmpresa({
    nome: '  Transporte   Seguro  ', telefone: '841234567',
    descricao: 'Viagens nacionais.', website: 'https://transporte.example'
  });
  assert.equal(dados.nome, 'Transporte Seguro');
  assert.equal(dados.telefone, '+258841234567');
  assert.equal(dados.website, 'https://transporte.example/');
});

test('rejeita website inseguro e imagem com assinatura falsa', async () => {
  assert.throws(() => validarDadosEmpresa({ nome: 'Empresa Teste', website: 'javascript:alert(1)' }), /website válido/);
  await assert.rejects(
    guardarLogotipoEmpresa({ nome: 'falso.png', dados: 'data:image/png;base64,QUJDREVGRw==' }),
    /conteúdo do logótipo/
  );
});
