import test from 'node:test';
import assert from 'node:assert/strict';
import { validarImagemDataUrl } from '../src/services/anexo-suporte.service.js';

test('aceita uma imagem PNG enviada no chat de suporte', () => {
  const imagem = validarImagemDataUrl({
    dados: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
  });

  assert.equal(imagem.mimeType, 'image/png');
  assert.equal(imagem.extensao, 'png');
  assert.ok(imagem.dados.length > 0);
});

test('recusa formatos não autorizados no chat de suporte', () => {
  assert.throws(
    () => validarImagemDataUrl({ dados: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==' }),
    /JPEG, PNG ou WebP/
  );
});

test('recusa imagens que ultrapassam 2 MB', () => {
  const dadosGrandes = Buffer.alloc((2 * 1024 * 1024) + 1).toString('base64');
  assert.throws(
    () => validarImagemDataUrl({ dados: `data:image/jpeg;base64,${dadosGrandes}` }),
    /no máximo 2 MB/
  );
});
