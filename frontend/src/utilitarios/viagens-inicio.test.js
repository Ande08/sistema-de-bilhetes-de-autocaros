import { describe, expect, it } from 'vitest';
import { normalizarLocalizacaoHabitual, temViagemActivaHoje } from './viagens-inicio.js';

describe('conteúdo inicial do passageiro', () => {
  it('reconhece um bilhete ativo para o dia atual', () => {
    const bilhetes = [{ estado: 'EMITIDO', viagem: { estado: 'AGENDADA', partidaEm: '2026-10-29T14:00:00+02:00' } }];
    expect(temViagemActivaHoje(bilhetes, new Date('2026-10-29T08:00:00+02:00'))).toBe(true);
  });

  it('não esconde a pesquisa por causa de uma viagem de outro dia ou cancelada', () => {
    const bilhetes = [
      { estado: 'EMITIDO', viagem: { estado: 'AGENDADA', partidaEm: '2026-10-30T14:00:00+02:00' } },
      { estado: 'CANCELADO', viagem: { estado: 'AGENDADA', partidaEm: '2026-10-29T14:00:00+02:00' } }
    ];
    expect(temViagemActivaHoje(bilhetes, new Date('2026-10-29T08:00:00+02:00'))).toBe(false);
  });

  it('aceita apenas uma localização habitual completa', () => {
    expect(normalizarLocalizacaoHabitual({ provincia: ' Sofala ', cidade: ' Beira ' })).toEqual({ provincia: 'Sofala', cidade: 'Beira' });
    expect(normalizarLocalizacaoHabitual({ provincia: 'Sofala' })).toBeNull();
  });
});
