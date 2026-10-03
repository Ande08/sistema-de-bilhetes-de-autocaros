import test from 'node:test';
import assert from 'node:assert/strict';
import { construirIndicadores } from '../src/services/administracao.service.js';

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
