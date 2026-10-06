import test from 'node:test';
import assert from 'node:assert/strict';
import { obterAdaptadorOtp } from '../src/adapters/otp.adapter.js';
import { servicoWhatsApp } from '../src/integrations/whatsapp/whatsapp.service.js';

test('serviço WhatsApp inicia sem expor sessão ou QR inexistente', () => {
  const estado = servicoWhatsApp.obterEstado();
  assert.equal(estado.estado, 'NAO_INICIADO');
  assert.equal(estado.ligado, false);
  assert.equal(estado.qrCodeDataUrl, null);
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
