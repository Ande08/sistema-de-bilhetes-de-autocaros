import { ConfiguracaoIa } from '../models/index.js';
import { desencriptarSegredo, encriptarSegredo } from './segredo.service.js';
import { obterModelosOpenRouter, solicitarConclusaoOpenRouter } from '../integrations/openrouter/openrouter.service.js';

export const MODELO_IA_PADRAO = 'deepseek/deepseek-chat:free';
const MODELOS_CONTINGENCIA = [
  { id: MODELO_IA_PADRAO, nome: 'DeepSeek V3 gratuito', gratuito: true },
  { id: 'deepseek/deepseek-r1:free', nome: 'DeepSeek R1 gratuito', gratuito: true },
  { id: 'openrouter/free', nome: 'OpenRouter Free Router', gratuito: true }
];

async function obterOuCriar() {
  const existente = await ConfiguracaoIa.findByPk(1);
  return existente || ConfiguracaoIa.create({ id: 1, modelo: MODELO_IA_PADRAO });
}

export async function obterConfiguracaoIaPublica() {
  return tornarPublica(await obterOuCriar());
}

export async function obterConfiguracaoIaInterna() {
  const configuracao = await obterOuCriar();
  return { ...tornarPublica(configuracao), apiKey: desencriptarSegredo(configuracao.apiKeyEncriptada) };
}

export async function actualizarConfiguracaoIa(dados, administradorId) {
  validarDadosConfiguracaoIa(dados);
  const configuracao = await obterOuCriar();
  const alteracoes = {
    fornecedor: 'OPENROUTER', modelo: dados.modelo.trim(), activo: Boolean(dados.activo), actualizadoPor: administradorId
  };
  if (dados.removerApiKey) alteracoes.apiKeyEncriptada = null;
  else if (dados.apiKey?.trim()) alteracoes.apiKeyEncriptada = encriptarSegredo(dados.apiKey.trim());
  await configuracao.update(alteracoes);
  return tornarPublica(configuracao);
}

export async function listarModelosIa() {
  const configuracao = await obterConfiguracaoIaInterna();
  const remotos = await obterModelosOpenRouter(configuracao.apiKey);
  if (!remotos) return { modelos: garantirModeloActual(MODELOS_CONTINGENCIA, configuracao.modelo), origem: 'CONTINGENCIA' };
  const modelos = remotos
    .filter((item) => item.id && item.architecture?.output_modalities?.includes('text'))
    .map((item) => ({
      id: item.id, nome: item.name || item.id,
      gratuito: Number(item.pricing?.prompt || 0) === 0 && Number(item.pricing?.completion || 0) === 0
    }))
    .sort((a, b) => Number(b.gratuito) - Number(a.gratuito) || a.nome.localeCompare(b.nome, 'pt'));
  return { modelos: garantirModeloActual(modelos, configuracao.modelo), origem: 'OPENROUTER' };
}

export async function testarConfiguracaoIa() {
  const configuracao = await obterConfiguracaoIaInterna();
  if (!configuracao.apiKeyConfigurada) { const erro = new Error('Guarde uma chave da OpenRouter antes de testar.'); erro.statusCode = 400; throw erro; }
  const resposta = await solicitarConclusaoOpenRouter({
    apiKey: configuracao.apiKey, modelo: configuracao.modelo, maxTokens: 30,
    mensagens: [{ role: 'user', content: 'Responda apenas: ligação estabelecida.' }]
  });
  return { sucesso: true, modelo: resposta.modelo, mensagem: 'Ligação à OpenRouter estabelecida com sucesso.' };
}

export function validarDadosConfiguracaoIa(dados) {
  if (!dados?.modelo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+$/.test(dados.modelo.trim())) erroValidacao('Seleccione um modelo válido da OpenRouter.');
  if (dados.apiKey && (dados.apiKey.trim().length < 20 || /\s/.test(dados.apiKey.trim()))) erroValidacao('A chave da OpenRouter possui um formato inválido.');
}

function tornarPublica(configuracao) {
  const apiKeyConfigurada = Boolean(configuracao.apiKeyEncriptada);
  return { id: configuracao.id, fornecedor: configuracao.fornecedor, modelo: configuracao.modelo, activo: configuracao.activo, apiKeyConfigurada, apiKeyMascarada: apiKeyConfigurada ? '••••••••••••' : '' };
}
function garantirModeloActual(modelos, modeloActual) { return modelos.some((item) => item.id === modeloActual) ? modelos : [{ id: modeloActual, nome: `${modeloActual} (configurado)`, gratuito: modeloActual.endsWith(':free') }, ...modelos]; }
function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; throw erro; }
