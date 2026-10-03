import test from 'node:test';
import assert from 'node:assert/strict';
import { ConstrutorBilhete } from '../src/builders/ticket.builder.js';

test('constrói bilhete emitido', () => {
  const bilhete = new ConstrutorBilhete()
    .passageiro({ nome: 'Ico Tiago' })
    .viagem({ id: 1, origem: 'Tete', destino: 'Maputo', partidaEm: '2026-10-01T07:00:00Z' })
    .assento({ id: 2, numero: 'A2' })
    .pagamento({ metodo: 'MPESA', referencia: 'PAG-1', valor: 1500, estado: 'APROVADO' })
    .preco(1500)
    .construir();
  assert.equal(bilhete.estado, 'EMITIDO');
  assert.equal(bilhete.passageiro.nome, 'Ico Tiago');
  assert.match(bilhete.codigo, /^BIL-/);
});

test('não permite bilhete incompleto', () => {
  assert.throws(() => new ConstrutorBilhete().passageiro({ nome: 'Ico Tiago' }).construir(), /Dados obrigatórios/);
});
