import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const directorioAnexosSuporte = fileURLToPath(new URL('../../.dados/suporte', import.meta.url));
const LIMITE_BYTES = 2 * 1024 * 1024;
const EXTENSOES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validarImagemDataUrl(imagem) {
  if (!imagem) return null;
  const correspondencia = String(imagem.dados || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!correspondencia || !EXTENSOES[correspondencia[1]]) throw erroImagem('A imagem deve estar no formato JPEG, PNG ou WebP.');
  const dados = Buffer.from(correspondencia[2], 'base64');
  if (!dados.length || dados.length > LIMITE_BYTES) throw erroImagem('A imagem deve ter no máximo 2 MB.');
  return { dados, mimeType: correspondencia[1], extensao: EXTENSOES[correspondencia[1]] };
}

export async function guardarImagemSuporte(imagem) {
  const validada = validarImagemDataUrl(imagem);
  if (!validada) return null;
  await mkdir(directorioAnexosSuporte, { recursive: true });
  const nomeFicheiro = `${randomUUID()}.${validada.extensao}`;
  const caminho = path.join(directorioAnexosSuporte, nomeFicheiro);
  await writeFile(caminho, validada.dados, { flag: 'wx' });
  return {
    caminho,
    imagemUrl: `/ficheiros/suporte/${nomeFicheiro}`,
    imagemNome: String(imagem.nome || `imagem.${validada.extensao}`).slice(0, 180)
  };
}

export async function removerImagemSuporte(caminho) {
  if (!caminho) return;
  await unlink(caminho).catch(() => {});
}

function erroImagem(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
