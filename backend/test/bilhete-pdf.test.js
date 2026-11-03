import test from 'node:test';
import assert from 'node:assert/strict';
import { construirUrlValidacaoBilhete, gerarBilhetePdf } from '../src/services/bilhete-pdf.service.js';

test('gera um documento PDF válido com os dados essenciais do bilhete', () => {
  const pdf = gerarBilhetePdf({
    bilhete: { codigo: 'BIL-TESTE-001', nomePassageiro: 'Ico Tiago', preco: 1500, estado: 'EMITIDO', createdAt: '2026-10-26T10:00:00Z' },
    empresa: { nome: 'Viagem Bus' },
    rota: { originProvince: 'Tete', origin: 'Tete', destinationProvince: 'Maputo Cidade', destination: 'Maputo' },
    viagem: { partidaEm: '2026-10-27T05:00:00Z' },
    assento: { numero: 'A1', juntoJanela: true },
    pagamento: { estado: 'APROVADO' }
  });

  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.4');
  assert.match(pdf.toString('latin1'), /BIL-TESTE-001/);
  assert.match(pdf.toString('latin1'), /% QR-CODE/);
  assert.match(pdf.toString('latin1'), /MediaBox \[0 0 226\.772 595\.276\]/);
  assert.match(pdf.toString('latin1'), /%%EOF/);
  assert.ok(pdf.length > 5000);
});

test('constrói a ligação pública usada pelo QR Code', () => {
  const anterior = process.env.PUBLIC_SITE_URL;
  process.env.PUBLIC_SITE_URL = 'https://ticket.famba.online/';
  assert.equal(construirUrlValidacaoBilhete('BIL-TESTE-001'), 'https://ticket.famba.online/validar-bilhete/BIL-TESTE-001');
  if (anterior === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = anterior;
});
