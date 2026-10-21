import test from 'node:test';
import assert from 'node:assert/strict';
import { obterAdaptadorOtp } from '../src/adapters/otp.adapter.js';
import { servicoWhatsApp } from '../src/integrations/whatsapp/whatsapp.service.js';
import { calcularAtrasoRepeticao } from '../src/services/fila-whatsapp.service.js';

test('serviço WhatsApp inicia sem expor sessão ou QR inexistente', () => {
  const estado = servicoWhatsApp.obterEstado();
  assert.equal(estado.estado, 'NAO_INICIADO');
  assert.equal(estado.ligado, false);
  assert.equal(estado.qrCodeDataUrl, null);
});

test('fila WhatsApp usa repetição exponencial com limite', () => {
  const primeira = calcularAtrasoRepeticao(1);
  const terceira = calcularAtrasoRepeticao(3);
  const muitoAlta = calcularAtrasoRepeticao(20);
  assert.ok(primeira >= 5000 && primeira < 6000);
  assert.ok(terceira >= 20000 && terceira < 21000);
  assert.ok(muitoAlta >= 900000 && muitoAlta < 901000);
});

test('adaptador WhatsApp restringe o canal a mensagens WhatsApp', async () => {
  const fornecedorAnterior = process.env.OTP_FORNECEDOR;
  process.env.OTP_FORNECEDOR = 'WHATSAPP_BAILEYS';
  try {
    const adaptador = obterAdaptadorOtp();
    await assert.rejects(() => adaptador.enviar({ telefone: '+258841234567', codigo: '123456', canal: 'SMS' }), /SMS ainda não está configurado/);
  } finally {
    if (fornecedorAnterior === undefined) delete process.env.OTP_FORNECEDOR;
    else process.env.OTP_FORNECEDOR = fornecedorAnterior;
  }
});
