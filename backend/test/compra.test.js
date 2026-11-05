import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPedidoAssentos, ServicoCompra } from '../src/services/compra.service.js';

const servico = new ServicoCompra();
const viagemValida = { id: 1, busId: 7, status: 'AGENDADA', departureAt: new Date(Date.now() + 86_400_000) };
const assentoValido = { id: 2, autocarroId: 7 };

test('aceita passageiro, viagem futura e assento do autocarro', () => {
  assert.doesNotThrow(() => servico._validarCompra({ utilizador: { activo: true, perfil: 'PASSAGEIRO' }, viagem: viagemValida, assento: assentoValido }));
});

test('rejeita viagem passada ou não agendada', () => {
  assert.throws(() => servico._validarCompra({ utilizador: { activo: true, perfil: 'PASSAGEIRO' }, viagem: { ...viagemValida, status: 'CANCELADA' }, assento: assentoValido }), /não está disponível/);
});

test('rejeita assento de outro autocarro', () => {
  assert.throws(() => servico._validarCompra({ utilizador: { activo: true, perfil: 'PASSAGEIRO' }, viagem: viagemValida, assento: { id: 3, autocarroId: 8 } }), /não pertence/);
});

test('impede que o bilhete seja emitido para uma conta administrativa', () => {
  assert.throws(() => servico._validarCompra({ utilizador: { activo: true, perfil: 'ADMIN' }, viagem: viagemValida, assento: assentoValido }), /conta do passageiro/);
});

test('aceita vários assentos ou atribuição automática na mesma compra', () => {
  assert.deepEqual(normalizarPedidoAssentos({ assentoIds: [2, 3, 4], quantidade: 3 }), {
    ids: [2, 3, 4], quantidade: 3, atribuicaoAutomatica: false
  });
  assert.deepEqual(normalizarPedidoAssentos({ quantidade: 3, atribuicaoAutomatica: true }), {
    ids: [], quantidade: 3, atribuicaoAutomatica: true
  });
});

test('rejeita quantidade diferente da seleção manual e mais de seis bilhetes', () => {
  assert.throws(() => normalizarPedidoAssentos({ assentoIds: [2, 3], quantidade: 3 }), /exactamente 3/i);
  assert.throws(() => normalizarPedidoAssentos({ quantidade: 7, atribuicaoAutomatica: true }), /entre 1 e 6/i);
});
