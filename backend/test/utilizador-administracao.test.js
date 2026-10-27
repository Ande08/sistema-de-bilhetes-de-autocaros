import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPerfil, validarRemocaoUtilizador } from '../src/services/utilizador-administracao.service.js';

test('aceita os perfis administrativos permitidos', () => {
  assert.equal(validarPerfil('passageiro'), 'PASSAGEIRO');
  assert.equal(validarPerfil('gestor_suporte'), 'GESTOR_SUPORTE');
  assert.equal(validarPerfil('admin'), 'ADMIN');
  assert.equal(validarPerfil('empresa_admin'), 'EMPRESA_ADMIN');
});

test('rejeita perfil de utilizador desconhecido', () => {
  assert.throws(() => validarPerfil('gestor'), /GESTOR_SUPORTE/);
});

test('impede que o administrador elimine a própria conta', () => {
  assert.throws(() => validarRemocaoUtilizador({ utilizadorId: 7, administradorId: 7, perfil: 'ADMIN', totalAdministradoresActivos: 2 }), /própria conta/);
});

test('impede a eliminação do último administrador ativo', () => {
  assert.throws(() => validarRemocaoUtilizador({ utilizadorId: 8, administradorId: 7, perfil: 'ADMIN', totalAdministradoresActivos: 0 }), /último administrador/);
});

test('permite eliminar outro utilizador quando a administração permanece disponível', () => {
  assert.doesNotThrow(() => validarRemocaoUtilizador({ utilizadorId: 8, administradorId: 7, perfil: 'PASSAGEIRO', totalAdministradoresActivos: 1 }));
});

test('permite eliminar um administrador que já está inativo', () => {
  assert.doesNotThrow(() => validarRemocaoUtilizador({ utilizadorId: 8, administradorId: 7, perfil: 'ADMIN', activo: false, totalAdministradoresActivos: 0 }));
});
