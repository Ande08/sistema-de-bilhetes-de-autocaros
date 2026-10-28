import test from 'node:test';
import assert from 'node:assert/strict';
import { construirIndicadores, construirIndicadoresPlataforma } from '../src/services/administracao.service.js';

test('calcula indicadores administrativos', () => {
  const indicadores = construirIndicadores({
    passageiros: [{ perfil: 'PASSAGEIRO' }, { perfil: 'ADMIN' }],
    autocarros: [{ active: true }, { active: false }],
    viagens: [{ status: 'AGENDADA' }, { status: 'CONCLUIDA' }],
    bilhetes: [{ estado: 'EMITIDO' }, { estado: 'CANCELADO' }],
    receitaAprovada: '2500.50'
  });
  assert.deepEqual(indicadores, { passageiros: 1, autocarrosActivos: 1, viagensAgendadas: 1, bilhetesEmitidos: 1, receitaAprovada: 2500.5 });
});

test('painel da plataforma apresenta volume de vendas sem calcular receita', () => {
  const agora = new Date();
  const indicadores = construirIndicadoresPlataforma({
    empresas: [{ activa: true, estadoCadastro: 'APROVADA' }, { activa: false, estadoCadastro: 'PENDENTE' }],
    usuariosActivos: 12,
    bilhetes: [{ estado: 'EMITIDO', criado_em: agora }, { estado: 'CANCELADO', criado_em: agora }],
    viagens: [{ status: 'AGENDADA' }]
  });
  assert.equal(indicadores.empresasActivas, 1);
  assert.equal(indicadores.empresasPendentes, 1);
  assert.equal(indicadores.volumeVendas, 1);
  assert.equal('receitaAprovada' in indicadores, false);
});
