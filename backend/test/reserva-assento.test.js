import test from 'node:test';
import assert from 'node:assert/strict';
import { reservaPertenceAoUtilizador } from '../src/services/reserva-assento.service.js';

test('aceita somente uma reserva pendente, válida e pertencente ao comprador', () => {
  const agora = new Date('2026-10-27T10:00:00Z');
  assert.equal(reservaPertenceAoUtilizador({
    utilizadorId: 7, estado: 'PENDENTE', expiraEm: new Date('2026-10-27T10:03:00Z')
  }, 7, agora), true);
  assert.equal(reservaPertenceAoUtilizador({
    utilizadorId: 8, estado: 'PENDENTE', expiraEm: new Date('2026-10-27T10:03:00Z')
  }, 7, agora), false);
  assert.equal(reservaPertenceAoUtilizador({
    utilizadorId: 7, estado: 'PENDENTE', expiraEm: new Date('2026-10-27T09:59:00Z')
  }, 7, agora), false);
});
