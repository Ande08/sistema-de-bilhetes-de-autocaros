import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { Empresa, User } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

// A empresa e a conta do seu primeiro administrador são criadas juntas. Assim,
// nunca fica uma transportadora sem alguém responsável por a configurar.
export async function criarEmpresaAdministrativa(dados, administrador) {
  if (administrador?.perfil !== 'ADMIN') {
    const erro = new Error('Apenas o administrador da plataforma pode criar empresas.');
    erro.statusCode = 403;
    throw erro;
  }

  const entrada = validarDadosNovaEmpresa(dados);
  const [empresaExistente, telefoneExistente] = await Promise.all([
    Empresa.findOne({ where: { slug: entrada.slug } }),
    User.findOne({ where: { telefone: entrada.administradorTelefone } })
  ]);
  if (empresaExistente) throw erroConflito('Já existe uma empresa registada com este nome.');
  if (telefoneExistente) throw erroConflito('O telefone do responsável já pertence a outro utilizador.');

  const palavraPasseHash = await bcrypt.hash(entrada.administradorPalavraPasse, 12);
  return sequelize.transaction(async (transaction) => {
    const empresa = await Empresa.create({
      nome: entrada.nome,
      slug: entrada.slug,
      telefone: entrada.telefone,
      descricao: entrada.descricao,
      website: entrada.website,
      activa: true
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

function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }
