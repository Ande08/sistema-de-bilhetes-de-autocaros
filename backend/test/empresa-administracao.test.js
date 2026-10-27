import test from 'node:test';
import assert from 'node:assert/strict';
import { validarDadosNovaEmpresa } from '../src/services/empresa-administracao.service.js';
import { ServicoOtp } from '../src/services/otp.service.js';

test('valida e normaliza os dados de uma nova empresa', () => {
  const dados = validarDadosNovaEmpresa({
    nome: '  Transporte Águia  ',
    telefone: '84 111 2233',
    website: 'https://aguia.co.mz',
    administradorNome: 'Ana',
    administradorApelido: 'Mabote',
    administradorTelefone: '+258 85 111 2233',
    administradorPalavraPasse: 'Empresa@123'
  });
  assert.equal(dados.nome, 'Transporte Águia');
  assert.equal(dados.slug, 'transporte-aguia');
  assert.equal(dados.administradorTelefone, '+258851112233');
});

test('rejeita website inseguro ou inválido', () => {
  assert.throws(() => validarDadosNovaEmpresa({
    nome: 'Transportes Teste', administradorNome: 'Ana', administradorApelido: 'Mabote',
    administradorTelefone: '841112233', administradorPalavraPasse: 'Empresa@123', website: 'javascript:alert(1)'
  }), /website válido/);
});

test('bloqueia o cadastro público de empresa antes de consultar a base de dados', async () => {
  const servico = new ServicoOtp();
  await assert.rejects(
    () => servico.solicitarCriacaoConta({ tipoConta: 'EMPRESA' }),
    (erro) => erro.statusCode === 403 && /administrador da plataforma/.test(erro.message)
  );
});
