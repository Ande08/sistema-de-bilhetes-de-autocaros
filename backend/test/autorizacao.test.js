import test from 'node:test';
import assert from 'node:assert/strict';
import { exigirAdministrador, exigirAdministradorEmpresa, exigirAtendenteOuAdministrador, exigirClienteOuOperadorEmpresa } from '../src/middlewares/autorizacao.middleware.js';

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

test('impede que o administrador da plataforma execute operações da empresa', () => {
  let erroEmpresa;
  let erroVenda;
  exigirAdministradorEmpresa({ utilizador: { perfil: 'ADMIN' } }, {}, (valor) => { erroEmpresa = valor; });
  exigirAtendenteOuAdministrador({ utilizador: { perfil: 'ADMIN' } }, {}, (valor) => { erroVenda = valor; });
  assert.equal(erroEmpresa.statusCode, 403);
  assert.equal(erroVenda.statusCode, 403);
});

test('permite que o administrador da empresa faça gestão operacional', () => {
  let chamado = false;
  exigirAdministradorEmpresa({ utilizador: { perfil: 'EMPRESA_ADMIN' } }, {}, () => { chamado = true; });
  assert.equal(chamado, true);
});

test('bloqueia reservas e pagamentos iniciados pelo administrador da plataforma', () => {
  let erro;
  exigirClienteOuOperadorEmpresa({ utilizador: { perfil: 'ADMIN' } }, {}, (valor) => { erro = valor; });
  assert.equal(erro.statusCode, 403);
});
