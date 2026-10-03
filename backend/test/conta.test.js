import test from 'node:test';
import assert from 'node:assert/strict';
import { construirResumoConta } from '../src/services/conta.service.js';

const agora = new Date('2026-10-03T10:00:00Z');
const bilhetes = [
  { id: 1, codigo: 'BIL-1', estado: 'EMITIDO', preco: '1500', Assento: { id: 2, numero: 'A2' }, Trip: { id: 3, departureAt: '2026-10-10T08:00:00Z', status: 'AGENDADA', Route: { origin: 'Tete', destination: 'Maputo' } }, Pagamento: { id: 4, metodo: 'MPESA', referencia: 'PAG-1', valor: '1500', estado: 'APROVADO', createdAt: '2026-10-03T10:00:00Z' } },
  { id: 5, codigo: 'BIL-2', estado: 'CANCELADO', preco: '900', Trip: { id: 6, departureAt: '2026-09-10T08:00:00Z', status: 'CONCLUIDA', Route: { origin: 'Beira', destination: 'Tete' } }, Pagamento: null }
];

test('calcula a próxima viagem e contagens da conta', () => {
  const resumo = construirResumoConta(bilhetes, agora);
  assert.equal(resumo.proximaViagem.codigo, 'BIL-1');
  assert.equal(resumo.totalBilhetesActivos, 1);
  assert.equal(resumo.totalPagamentosSeisMeses, 1);
});

test('mantém bilhetes cancelados no histórico', () => {
  const resumo = construirResumoConta(bilhetes, agora);
  assert.equal(resumo.bilhetes.length, 2);
  assert.equal(resumo.bilhetes[1].estado, 'CANCELADO');
});
