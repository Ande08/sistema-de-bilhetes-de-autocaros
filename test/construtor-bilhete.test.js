import test from 'node:test';
import assert from 'node:assert/strict';
import { TicketBuilder } from '../src/builders/ticket.builder.js';

test('constrói bilhete emitido', () => {
  const bilhete = new TicketBuilder()
    .passenger({ nome: 'Ico Tiago' })
    .trip({ id: 1, origem: 'Tete', destino: 'Maputo', partidaEm: '2026-10-01T07:00:00Z' })
    .seat({ id: 2, numero: 'A2' })
    .payment({ metodo: 'MPESA', referencia: 'PAG-1', valor: 1500, estado: 'APROVADO' })
    .price(1500)
    .build();
  assert.equal(bilhete.estado, 'EMITIDO');
  assert.equal(bilhete.passageiro.nome, 'Ico Tiago');
  assert.match(bilhete.code, /^BIL-/);
});

test('não permite bilhete incompleto', () => {
  assert.throws(() => new TicketBuilder().passenger({ nome: 'Ico Tiago' }).build(), /Dados obrigatórios/);
});
