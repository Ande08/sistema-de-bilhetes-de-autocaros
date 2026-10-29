import test from 'node:test';
import assert from 'node:assert/strict';
import { obterIntervaloPesquisaViagens } from '../src/services/pesquisa-viagem.service.js';

test('sem data pesquisa todas as partidas futuras sem limitar o último dia', () => {
  const agora = new Date('2026-10-29T08:30:00.000Z'); // 10:30 em Maputo
  const intervalo = obterIntervaloPesquisaViagens('', agora);

  assert.equal(intervalo.data, null);
  assert.equal(intervalo.inicio.toISOString(), agora.toISOString());
  assert.equal(intervalo.fim, null);
});

test('com data opcional pesquisa o dia escolhido sem incluir partidas passadas', () => {
  const agora = new Date('2026-10-29T08:30:00.000Z');
  const futuro = obterIntervaloPesquisaViagens('2026-10-31', agora);
  const hoje = obterIntervaloPesquisaViagens('2026-10-29', agora);

  assert.equal(futuro.inicio.toISOString(), '2026-10-30T22:00:00.000Z');
  assert.equal(hoje.inicio.toISOString(), agora.toISOString());
});

test('rejeita datas inexistentes', () => {
  assert.throws(() => obterIntervaloPesquisaViagens('2026-02-30'), /data informada é inválida/i);
});
