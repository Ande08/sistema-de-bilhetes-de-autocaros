import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Empresa, User } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

// A empresa e a conta do seu primeiro administrador são criadas juntas. Assim,
// nunca fica uma transportadora sem alguém responsável por a configurar.
export async function criarEmpresaAdministrativa(dados, administrador) {
  garantirAdministradorPlataforma(administrador);

  const entrada = validarDadosNovaEmpresa(dados);
  const [empresaExistente, telefoneExistente] = await Promise.all([
    Empresa.findOne({ where: { slug: entrada.slug } }),
    User.findOne({ where: { telefone: entrada.administradorTelefone } })
  ]);
  if (empresaExistente) throw erroConflito('Já existe uma empresa registada com este nome.');
  if (telefoneExistente) throw erroConflito('O telefone do responsável já pertence a outro usuário.');

  const palavraPasseHash = await bcrypt.hash(entrada.administradorPalavraPasse, 12);
  return sequelize.transaction(async (transaction) => {
    const empresa = await Empresa.create({
      nome: entrada.nome,
      slug: entrada.slug,
      // O perfil institucional pertence à empresa. O administrador empresarial
      // acrescenta telefone, descrição, website e logótipo no primeiro acesso.
      telefone: null,
      descricao: null,
      website: null,
      activa: true,
      estadoCadastro: 'APROVADA',
      aprovadaEm: new Date()
    }, { transaction });
    const responsavel = await User.create({
      nome: entrada.administradorNome,
      apelido: entrada.administradorApelido,
      telefone: entrada.administradorTelefone,
      palavraPasseHash,
      perfil: 'EMPRESA_ADMIN',
      empresaId: empresa.id,
      activo: true
    }, { transaction });
    return { empresa, responsavel };
  });
}

export async function listarEmpresasAdministrativas(administrador) {
  garantirAdministradorPlataforma(administrador);
  return Empresa.findAll({
    where: { eliminadaEm: null },
    include: [{
      model: User,
      where: { perfil: 'EMPRESA_ADMIN', eliminadoEm: null },
      required: false,
      attributes: ['id', 'nome', 'apelido', 'telefone', 'activo']
    }],
    order: [['nome', 'ASC']]
  });
}

export async function obterEmpresaAdministrativa(id, administrador) {
  garantirAdministradorPlataforma(administrador);
  const empresa = await Empresa.findOne({
    where: { id, eliminadaEm: null },
    include: [{
      model: User,
      where: { perfil: 'EMPRESA_ADMIN', eliminadoEm: null },
      required: false,
      attributes: ['id', 'nome', 'apelido', 'telefone', 'activo']
    }]
  });
  if (!empresa) throw erroNaoEncontrado();
  return empresa;
}

export async function actualizarEmpresaAdministrativa(id, dados, administrador) {
  const empresa = await obterEmpresaAdministrativa(id, administrador);
  // A plataforma pode corrigir o nome que identifica a empresa, mas não deve
  // substituir o perfil institucional mantido pelo administrador empresarial.
  const alteracoes = validarDadosEdicaoEmpresa({
    nome: dados.nome,
    telefone: empresa.telefone,
    descricao: empresa.descricao,
    website: empresa.website
  });
  const repetida = await Empresa.findOne({
    where: { slug: alteracoes.slug, id: { [Op.ne]: id } }
  });
  if (repetida) throw erroConflito('Já existe uma empresa registada com este nome.');
  await empresa.update(alteracoes);
  return obterEmpresaAdministrativa(id, administrador);
}

export async function definirEstadoEmpresaAdministrativa(id, activa, administrador) {
  const empresa = await obterEmpresaAdministrativa(id, administrador);
  if (typeof activa !== 'boolean') throw erroValidacao('O estado da empresa deve ser verdadeiro ou falso.');
  await empresa.update({
    activa,
    estadoCadastro: activa ? 'APROVADA' : 'SUSPENSA',
    motivoEstado: activa ? null : 'Empresa suspensa pela administração da plataforma.',
    ...(activa && { aprovadaEm: empresa.aprovadaEm || new Date() })
  });
  return obterEmpresaAdministrativa(id, administrador);
}

export async function decidirCadastroEmpresaAdministrativa(id, decisao, motivo, administrador) {
  const empresa = await obterEmpresaAdministrativa(id, administrador);
  const estado = String(decisao || '').toUpperCase();
  if (!['APROVADA', 'REJEITADA'].includes(estado)) throw erroValidacao('A decisão deve ser APROVADA ou REJEITADA.');
  const justificacao = String(motivo || '').trim();
  if (estado === 'REJEITADA' && justificacao.length < 5) throw erroValidacao('Indique o motivo da rejeição.');
  await empresa.update({
    estadoCadastro: estado,
    activa: estado === 'APROVADA',
    motivoEstado: estado === 'REJEITADA' ? justificacao.slice(0, 500) : null,
    aprovadaEm: estado === 'APROVADA' ? new Date() : null
  });
  return obterEmpresaAdministrativa(id, administrador);
}

export async function eliminarEmpresaAdministrativa(id, administrador) {
  const empresa = await obterEmpresaAdministrativa(id, administrador);
  // O slug recebe um sufixo para permitir que uma nova empresa legítima use o
  // mesmo nome, sem apagar o histórico associado à empresa antiga.
  const sufixo = `-eliminada-${empresa.id}-${Date.now()}`;
  await empresa.update({
    activa: false,
    eliminadaEm: new Date(),
    slug: `${empresa.slug.slice(0, 180 - sufixo.length)}${sufixo}`
  });
}

// Exportada para permitir testes unitários sem depender da base de dados.
export function validarDadosNovaEmpresa(dados = {}) {
  const nome = validarNomeEmpresa(dados.nome);
  const administradorPalavraPasse = String(dados.administradorPalavraPasse || '');
  validarPalavraPasse(administradorPalavraPasse);
  return {
    nome,
    slug: criarSlug(nome),
    telefone: dados.telefone ? normalizarTelefone(dados.telefone) : null,
    descricao: textoOpcional(dados.descricao, 500, 'descrição'),
    website: validarWebsite(dados.website),
    administradorNome: validarNome(dados.administradorNome),
    administradorApelido: validarApelido(dados.administradorApelido),
    administradorTelefone: normalizarTelefone(dados.administradorTelefone),
    administradorPalavraPasse
  };
}

export function validarDadosEdicaoEmpresa(dados = {}) {
  const nome = validarNomeEmpresa(dados.nome);
  return {
    nome,
    slug: criarSlug(nome),
    telefone: dados.telefone ? normalizarTelefone(dados.telefone) : null,
    descricao: textoOpcional(dados.descricao, 500, 'descrição'),
    website: validarWebsite(dados.website)
  };
}

function validarNomeEmpresa(valor) {
  const nome = String(valor || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 3 || nome.length > 160) throw erroValidacao('O nome da empresa deve ter entre 3 e 160 caracteres.');
  if (!/[\p{L}\d].*[\p{L}\d]/u.test(nome)) throw erroValidacao('Introduza um nome de empresa válido.');
  return nome;
}

function criarSlug(valor) {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function textoOpcional(valor, limite, campo) {
  const texto = String(valor || '').trim();
  if (texto.length > limite) throw erroValidacao(`A ${campo} deve ter no máximo ${limite} caracteres.`);
  return texto || null;
}

function validarWebsite(valor) {
  const website = String(valor || '').trim();
  if (!website) return null;
  if (website.length > 240) throw erroValidacao('O website deve ter no máximo 240 caracteres.');
  try {
    const url = new URL(website);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw erroValidacao('Introduza um website válido iniciado por http:// ou https://.');
  }
  return website;
}

function garantirAdministradorPlataforma(administrador) {
  if (administrador?.perfil !== 'ADMIN') {
    const erro = new Error('Apenas o administrador da plataforma pode gerir empresas.');
    erro.statusCode = 403;
    throw erro;
  }
}

function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
function erroNaoEncontrado() { const erro = new Error('Empresa não encontrada.'); erro.statusCode = 404; return erro; }
