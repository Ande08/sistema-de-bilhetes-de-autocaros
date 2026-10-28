import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPerfil, validarRemocaoUtilizador, validarVinculoCriacaoAdministrativa } from '../src/services/utilizador-administracao.service.js';

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

test('permite ao administrador da plataforma criar administrador para uma empresa', () => {
  const empresaId = validarVinculoCriacaoAdministrativa({
    administrador: { perfil: 'ADMIN' }, perfil: 'EMPRESA_ADMIN', empresaId: 15
  });
  assert.equal(empresaId, 15);
});

test('exige empresa ao criar administrador empresarial', () => {
  assert.throws(() => validarVinculoCriacaoAdministrativa({
    administrador: { perfil: 'ADMIN' }, perfil: 'EMPRESA_ADMIN'
  }), /Selecione a empresa/);
});

test('mantém o atendente dentro da empresa do seu administrador', () => {
  const empresaId = validarVinculoCriacaoAdministrativa({
    administrador: { perfil: 'EMPRESA_ADMIN', empresaId: 8 }, perfil: 'GESTOR_SUPORTE', empresaId: 99
  });
  assert.equal(empresaId, 8);
});
