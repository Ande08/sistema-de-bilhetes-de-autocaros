import test from 'node:test';
import assert from 'node:assert/strict';
import { validarDadosEdicaoEmpresa, validarDadosNovaEmpresa } from '../src/services/empresa-administracao.service.js';
import { ServicoOtp } from '../src/services/otp.service.js';
import { VerificacaoOtp } from '../src/models/index.js';

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

test('valida e normaliza os dados de edição de uma empresa', () => {
  const dados = validarDadosEdicaoEmpresa({
    nome: '  Expresso Maputo Sul  ',
    telefone: '84 222 3344',
    descricao: 'Transporte interprovincial.',
    website: 'https://expresso.example.com'
  });
  assert.equal(dados.nome, 'Expresso Maputo Sul');
  assert.equal(dados.slug, 'expresso-maputo-sul');
  assert.equal(dados.telefone, '+258842223344');
});

test('bloqueia cadastro público de empresa', async () => {
  const servico = new ServicoOtp();
  await assert.rejects(
    () => servico.solicitarCriacaoConta({
      tipoConta: 'EMPRESA', empresaNome: 'Transportes Teste', nome: 'Ana', apelido: 'Mabote',
      telefone: '841112233', palavraPasse: 'Empresa@123', canal: 'WHATSAPP'
    }),
    (erro) => erro.statusCode === 403 && /apenas para clientes/i.test(erro.message)
  );
});

test('invalida OTP empresarial público solicitado antes do bloqueio', async (contexto) => {
  const original = VerificacaoOtp.findOne;
  contexto.after(() => { VerificacaoOtp.findOne = original; });
  let consumido = false;
  VerificacaoOtp.findOne = async () => ({
    tipoConta: 'EMPRESA', tentativas: 0,
    update: async ({ consumidoEm }) => { consumido = consumidoEm instanceof Date; }
  });

  await assert.rejects(
    () => new ServicoOtp().confirmarCriacaoConta({ telefone: '841112233', codigo: '123456' }),
    (erro) => erro.statusCode === 403 && /já não pode ser concluído/i.test(erro.message)
  );
  assert.equal(consumido, true);
});
