import { Empresa } from '../models/index.js';
import { normalizarTelefone } from '../validacoes/utilizador.validacao.js';
import { guardarLogotipoEmpresa, removerLogotipoEmpresa } from './logotipo-empresa.service.js';

export async function obterPerfilEmpresa(utilizador) {
  garantirAdministradorEmpresa(utilizador);
  const empresa = await Empresa.findOne({ where: { id: utilizador.empresaId, eliminadaEm: null } });
  if (!empresa) throw erroNaoEncontrado();
  return empresa;
}

export async function actualizarPerfilEmpresa(utilizador, dados) {
  garantirAdministradorEmpresa(utilizador);
  const empresa = await Empresa.findOne({ where: { id: utilizador.empresaId, eliminadaEm: null } });
  if (!empresa) throw erroNaoEncontrado();

  const alteracoes = validarDadosEmpresa(dados);
  let novoLogotipo = null;
  if (dados.removerLogo === true || dados.removerLogo === 'true') alteracoes.logoUrl = null;
  if (dados.logo) {
    novoLogotipo = await guardarLogotipoEmpresa(dados.logo);
    alteracoes.logoUrl = novoLogotipo.logoUrl;
  }

  const logoAnterior = empresa.logoUrl;
  try {
    await empresa.update(alteracoes);
  } catch (erro) {
    if (novoLogotipo) await removerLogotipoEmpresa(novoLogotipo.logoUrl);
    throw erro;
  }
  if (logoAnterior && logoAnterior !== empresa.logoUrl) await removerLogotipoEmpresa(logoAnterior);
  return empresa;
}

export function validarDadosEmpresa({ nome, telefone, descricao, website }) {
  const nomeNormalizado = String(nome || '').trim().replace(/\s+/g, ' ');
  if (nomeNormalizado.length < 3 || nomeNormalizado.length > 160) throw erroValidacao('O nome da empresa deve ter entre 3 e 160 caracteres.');
  const descricaoNormalizada = String(descricao || '').trim();
  if (descricaoNormalizada.length > 500) throw erroValidacao('A descrição deve ter no máximo 500 caracteres.');
  const websiteNormalizado = validarWebsiteOpcional(website);
  return {
    nome: nomeNormalizado,
    telefone: telefone ? normalizarTelefone(telefone) : null,
    descricao: descricaoNormalizada || null,
    website: websiteNormalizado
  };
}

function validarWebsiteOpcional(valor) {
  const website = String(valor || '').trim();
  if (!website) return null;
  try {
    const url = new URL(website);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    if (website.length > 240) throw new Error();
    return url.toString();
  } catch {
    throw erroValidacao('Introduza um website válido iniciado por http:// ou https://.');
  }
}

function garantirAdministradorEmpresa(utilizador) {
  if (utilizador?.perfil !== 'EMPRESA_ADMIN' || !utilizador.empresaId) {
    const erro = new Error('Apenas o administrador da empresa pode editar estes dados.');
    erro.statusCode = 403;
    throw erro;
  }
}

function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroNaoEncontrado() { const erro = new Error('Empresa não encontrada.'); erro.statusCode = 404; return erro; }
