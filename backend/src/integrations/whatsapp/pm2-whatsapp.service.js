import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { estadoInicial, lerEstadoWhatsapp, obterCaminhoEstadoWhatsapp } from './whatsapp-state.store.js';

const executarFicheiro = promisify(execFile);
const raizBackend = fileURLToPath(new URL('../../../', import.meta.url));
const caminhoWorker = fileURLToPath(new URL('../../workers/whatsapp.worker.js', import.meta.url));
const nomeProcesso = validarNomeProcesso(process.env.WHATSAPP_PM2_NOME || 'viagem-bus-whatsapp');
let inicializacaoEmCurso = null;
let consultaEmCurso = null;
let cacheInstancia = null;
let cacheValidoAte = 0;

async function executarPm2(argumentos) {
  const executavel = process.env.PM2_EXECUTAVEL || (process.platform === 'win32' ? 'pm2.cmd' : 'pm2');
  const comando = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : executavel;
  const argumentosComando = process.platform === 'win32' ? ['/d', '/s', '/c', executavel, ...argumentos] : argumentos;
  try {
    return await executarFicheiro(comando, argumentosComando, { cwd: raizBackend, windowsHide: true, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 });
  } catch (erro) {
    const detalhe = String(erro.stderr || erro.message || '').trim();
    const falha = new Error(`Não foi possível gerir o bot no PM2. Confirme se o PM2 está instalado e disponível. ${detalhe}`.trim());
    falha.statusCode = 503;
    throw falha;
  }
}

export async function obterInstanciaWhatsappPm2({ ignorarCache = false } = {}) {
  if (!ignorarCache && cacheInstancia && Date.now() < cacheValidoAte) return cacheInstancia;
  if (!ignorarCache && consultaEmCurso) return consultaEmCurso;
  consultaEmCurso = (async () => {
    const { stdout } = await executarPm2(['jlist']);
    const inicioJson = stdout.indexOf('[');
    const processos = inicioJson >= 0 ? JSON.parse(stdout.slice(inicioJson)) : [];
    const processo = processos.find((item) => item.name === nomeProcesso);
    cacheInstancia = processo ? {
      nome: nomeProcesso,
      existe: true,
      online: processo.pm2_env?.status === 'online',
      estado: processo.pm2_env?.status || 'desconhecido',
      pid: processo.pid || null,
      reinicios: processo.pm2_env?.restart_time || 0
    } : { nome: nomeProcesso, existe: false, online: false, estado: 'não criado', pid: null, reinicios: 0 };
    cacheValidoAte = Date.now() + 8_000;
    return cacheInstancia;
  })().finally(() => { consultaEmCurso = null; });
  return consultaEmCurso;
}

export async function garantirInstanciaWhatsappPm2() {
  if (inicializacaoEmCurso) return inicializacaoEmCurso;
  inicializacaoEmCurso = _garantirInstancia().finally(() => { inicializacaoEmCurso = null; });
  return inicializacaoEmCurso;
}

async function _garantirInstancia() {
  const actual = await obterInstanciaWhatsappPm2({ ignorarCache: true });
  if (actual.online) return actual;
  if (actual.existe) await executarPm2(['restart', nomeProcesso, '--update-env']);
  else {
    await executarPm2(['start', caminhoWorker, '--name', nomeProcesso, '--cwd', raizBackend, '--time']);
    // Guarda a lista para que a instância possa ser restaurada pelo PM2 após reinício do computador.
    await executarPm2(['save', '--force']);
  }
  cacheValidoAte = 0;
  return obterInstanciaWhatsappPm2({ ignorarCache: true });
}

export async function renovarInstanciaWhatsappPm2() {
  const actual = await obterInstanciaWhatsappPm2({ ignorarCache: true });
  if (actual.existe && actual.online) await executarPm2(['stop', nomeProcesso]);
  cacheValidoAte = 0;
  await apagarDadosSessao();
  return garantirInstanciaWhatsappPm2();
}

export async function obterEstadoWhatsappGerido() {
  const instancia = await obterInstanciaWhatsappPm2();
  if (!instancia.online) return { ...estadoInicial(), estado: 'PROCESSO_PARADO', pm2: instancia };
  return { ...await lerEstadoWhatsapp(), pm2: instancia };
}

export async function aguardarEstadoWhatsapp(tentativas = 20) {
  for (let indice = 0; indice < tentativas; indice += 1) {
    const estado = await obterEstadoWhatsappGerido();
    if (!['NAO_INICIADO', 'PROCESSO_PARADO'].includes(estado.estado)) return estado;
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  return obterEstadoWhatsappGerido();
}

async function apagarDadosSessao() {
  const raizDados = path.join(raizBackend, '.dados');
  const configurada = process.env.WHATSAPP_SESSION_PATH;
  const pastaSessao = configurada ? (path.isAbsolute(configurada) ? configurada : path.resolve(raizBackend, configurada)) : path.join(raizDados, 'whatsapp');
  const relativa = path.relative(raizDados, pastaSessao);
  if (!relativa || relativa.startsWith('..') || path.isAbsolute(relativa)) {
    const erro = new Error('A sessão WhatsApp só pode ser renovada dentro da pasta .dados do backend.');
    erro.statusCode = 400;
    throw erro;
  }
  await rm(pastaSessao, { recursive: true, force: true });
  await rm(obterCaminhoEstadoWhatsapp(), { force: true });
}

export function obterNomeProcessoWhatsapp() { return nomeProcesso; }

function validarNomeProcesso(valor) {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(valor)) throw new Error('WHATSAPP_PM2_NOME contém caracteres inválidos.');
  return valor;
}
