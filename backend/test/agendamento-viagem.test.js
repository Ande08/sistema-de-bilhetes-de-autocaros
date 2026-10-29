import test from 'node:test';
import assert from 'node:assert/strict';
import { criarOcorrenciaUnica, gerarOcorrenciasRecorrentes } from '../src/services/agendamento-viagem.service.js';

const agora = new Date('2026-10-29T08:00:00+02:00');

test('gera uma viagem para todos os dias do período', () => {
  const ocorrencias = gerarOcorrenciasRecorrentes({
    tipoAgendamento: 'DIARIA', dataInicio: '2026-10-29', dataFim: '2026-11-01',
    horaPartida: '14:30', duracaoMinutos: 180
  }, agora);
  assert.equal(ocorrencias.length, 4);
  assert.equal(ocorrencias[0].departureAt.toISOString(), '2026-10-29T12:30:00.000Z');
  assert.equal(ocorrencias[0].arrivalExpectedAt.toISOString(), '2026-10-29T15:30:00.000Z');
});

test('gera apenas os dias da semana selecionados', () => {
  const ocorrencias = gerarOcorrenciasRecorrentes({
    tipoAgendamento: 'SEMANAL', dataInicio: '2026-11-02', dataFim: '2026-11-08',
    horaPartida: '06:00', duracaoMinutos: 120, diasSemana: [1, 3, 5]
  }, agora);
  assert.equal(ocorrencias.length, 3);
  assert.deepEqual(ocorrencias.map((item) => item.departureAt.getUTCDay()), [1, 3, 5]);
});

test('rejeita período superior a um ano e semana sem dias', () => {
  assert.throws(() => gerarOcorrenciasRecorrentes({
    tipoAgendamento: 'DIARIA', dataInicio: '2026-01-01', dataFim: '2027-12-31',
    horaPartida: '08:00', duracaoMinutos: 60
  }, agora), /366 dias/);
  assert.throws(() => gerarOcorrenciasRecorrentes({
    tipoAgendamento: 'SEMANAL', dataInicio: '2026-11-01', dataFim: '2026-11-30',
    horaPartida: '08:00', duracaoMinutos: 60, diasSemana: []
  }, agora), /dia da semana/);
});

test('rejeita ocorrências da própria série que se sobrepõem', () => {
  assert.throws(() => gerarOcorrenciasRecorrentes({
    tipoAgendamento: 'DIARIA', dataInicio: '2026-11-01', dataFim: '2026-11-03',
    horaPartida: '08:00', duracaoMinutos: 1500
  }, agora), /ao mesmo tempo/);
});

test('valida a ordem de partida e chegada da viagem única', () => {
  assert.throws(() => criarOcorrenciaUnica({
    partidaEm: '2099-01-02T10:00:00Z', chegadaPrevistaEm: '2099-01-02T09:00:00Z'
  }), /posterior/);
});
