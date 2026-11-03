import test from 'node:test';
import assert from 'node:assert/strict';
import { obterIntervaloPesquisaViagens, validarOrigemDestino } from '../src/services/pesquisa-viagem.service.js';

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

test('rejeita uma data anterior ao dia atual em Maputo', () => {
  const agora = new Date('2026-11-03T00:30:00.000Z'); // 02:30 em Maputo
  assert.throws(
    () => obterIntervaloPesquisaViagens('2026-11-02', agora),
    (erro) => erro.statusCode === 400 && /anterior a hoje/i.test(erro.message)
  );
});

test('rejeita pesquisas com a mesma origem e destino', () => {
  assert.throws(
    () => validarOrigemDestino({ origem: 'Maputo', destino: 'mapúto', origemProvincia: 'Maputo Cidade', destinoProvincia: 'Maputo Cidade' }),
    (erro) => erro.statusCode === 400 && /devem ser diferentes/i.test(erro.message)
  );
  assert.doesNotThrow(() => validarOrigemDestino({ origem: 'Maputo', destino: 'Matola' }));
});
