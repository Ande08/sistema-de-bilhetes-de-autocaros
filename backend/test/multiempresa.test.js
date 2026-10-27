import test from 'node:test';
import assert from 'node:assert/strict';
import { exigirAdministradorEmpresaOuPlataforma } from '../src/middlewares/autorizacao.middleware.js';
import { filtroEmpresa, garantirMesmaEmpresa } from '../src/services/empresa-escopo.service.js';
import { obterLocalidadeValida } from '../src/services/localidades.service.js';
import { ServicoCompra } from '../src/services/compra.service.js';

test('administrador da empresa pode abrir o painel administrativo', () => {
  let chamado = false;
  exigirAdministradorEmpresaOuPlataforma({ utilizador: { perfil: 'EMPRESA_ADMIN' } }, {}, () => { chamado = true; });
  assert.equal(chamado, true);
});

test('consultas da empresa recebem o filtro do inquilino autenticado', () => {
  assert.deepEqual(filtroEmpresa({ perfil: 'EMPRESA_ADMIN', empresaId: 15 }), { empresaId: 15 });
  assert.deepEqual(filtroEmpresa({ perfil: 'ADMIN' }), {});
});

test('impede uma empresa de operar uma entidade de outra empresa', () => {
  assert.throws(
    () => garantirMesmaEmpresa({ perfil: 'EMPRESA_ADMIN', empresaId: 2 }, { empresaId: 3 }),
    /outra empresa/
  );
});

test('valida província e cidade pelo catálogo oficial do sistema', () => {
  assert.deepEqual(obterLocalidadeValida('Maputo Província', 'Matola'), { provincia: 'Maputo Província', cidade: 'Matola' });
  assert.throws(() => obterLocalidadeValida('Tete', 'Matola'), /província e uma cidade válidas/);
});

test('atendente só vende uma viagem pertencente à própria empresa', () => {
  const servico = new ServicoCompra();
  const base = {
    utilizador: { activo: true, perfil: 'PASSAGEIRO' },
    viagem: { id: 1, empresaId: 8, busId: 4, status: 'AGENDADA', departureAt: new Date(Date.now() + 86_400_000) },
    assento: { id: 2, autocarroId: 4 }
  };
  assert.doesNotThrow(() => servico._validarCompra({ ...base, operador: { perfil: 'GESTOR_SUPORTE', empresaId: 8 } }));
  assert.throws(() => servico._validarCompra({ ...base, operador: { perfil: 'GESTOR_SUPORTE', empresaId: 9 } }), /própria empresa/);
});
