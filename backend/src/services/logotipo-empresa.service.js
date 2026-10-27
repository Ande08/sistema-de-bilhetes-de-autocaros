import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validarImagemDataUrl } from './anexo-suporte.service.js';

export const directorioLogotiposEmpresas = fileURLToPath(new URL('../../.dados/empresas', import.meta.url));

export async function guardarLogotipoEmpresa(imagem) {
  const validada = validarImagemDataUrl(imagem);
  if (!validada) return null;
  validarAssinaturaImagem(validada);
  await mkdir(directorioLogotiposEmpresas, { recursive: true });
  const nomeFicheiro = `${randomUUID()}.${validada.extensao}`;
  const caminho = path.join(directorioLogotiposEmpresas, nomeFicheiro);
  await writeFile(caminho, validada.dados, { flag: 'wx' });
  return { caminho, logoUrl: `/ficheiros/empresas/${nomeFicheiro}` };
}

export async function removerLogotipoEmpresa(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith('/ficheiros/empresas/')) return;
  const nomeFicheiro = path.basename(logoUrl);
  const caminho = path.join(directorioLogotiposEmpresas, nomeFicheiro);
  await unlink(caminho).catch(() => {});
}

function validarAssinaturaImagem({ dados, mimeType }) {
  const png = dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = dados[0] === 0xff && dados[1] === 0xd8 && dados[dados.length - 2] === 0xff && dados[dados.length - 1] === 0xd9;
  const webp = dados.subarray(0, 4).toString('ascii') === 'RIFF' && dados.subarray(8, 12).toString('ascii') === 'WEBP';
  const valida = (mimeType === 'image/png' && png) || (mimeType === 'image/jpeg' && jpeg) || (mimeType === 'image/webp' && webp);
  if (!valida) {
    const erro = new Error('O conteúdo do logótipo não corresponde ao formato informado.');
    erro.statusCode = 400;
    throw erro;
  }
}
