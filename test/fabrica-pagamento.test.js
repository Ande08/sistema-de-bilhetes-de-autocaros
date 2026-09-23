import test from 'node:test';
import assert from 'node:assert/strict';
import { FabricaPagamento } from '../src/factories/payment.factory.js';

test('cria pagamento M-Pesa aprovado', () => {
  const pagamento = FabricaPagamento.criar('MPESA').processar({ valor: 1500, referencia: 'PAG-TESTE-1' });
  assert.equal(pagamento.metodo, 'MPESA');
  assert.equal(pagamento.estado, 'APROVADO');
});

test('rejeita método inválido', () => {
  assert.throws(() => FabricaPagamento.criar('CHEQUE'), /Método de pagamento inválido/);
});
