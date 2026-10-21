import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizBackend = fileURLToPath(new URL('../../../', import.meta.url));
const pastaDados = path.join(raizBackend, '.dados');
const caminhoPadrao = path.join(pastaDados, 'whatsapp-estado.json');
let escritaPendente = Promise.resolve();

export function obterCaminhoEstadoWhatsapp() {
  const configurado = process.env.WHATSAPP_STATE_PATH;
  return configurado ? (path.isAbsolute(configurado) ? configurado : path.resolve(raizBackend, configurado)) : caminhoPadrao;
}

export async function guardarEstadoWhatsapp(estado) {
  const caminho = obterCaminhoEstadoWhatsapp();
  escritaPendente = escritaPendente.catch(() => {}).then(async () => {
    await mkdir(path.dirname(caminho), { recursive: true });
    const temporario = `${caminho}.${process.pid}.tmp`;
    await writeFile(temporario, JSON.stringify({ ...estado, processoId: process.pid }), 'utf8');
    await rename(temporario, caminho);
  });
  return escritaPendente;
}

export async function lerEstadoWhatsapp() {
  try {
    return JSON.parse(await readFile(obterCaminhoEstadoWhatsapp(), 'utf8'));
  } catch (erro) {
    if (erro.code !== 'ENOENT' && erro.name !== 'SyntaxError') throw erro;
    return estadoInicial();
  }
}

export function estadoInicial() {
  return {
    estado: 'NAO_INICIADO', ligado: false, numero: null, qrCodeDataUrl: null,
    ultimaAlteracao: null, tentativasReconexao: 0, processoId: null
  };
}
