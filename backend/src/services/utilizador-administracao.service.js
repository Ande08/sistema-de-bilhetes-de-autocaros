import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { Op } from 'sequelize';
import { Empresa, User } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

function validarPerfil(perfil) {
  const normalizado = String(perfil || '').toUpperCase();
  if (!['PASSAGEIRO', 'GESTOR_SUPORTE', 'EMPRESA_ADMIN', 'ADMIN'].includes(normalizado)) {
    const erro = new Error('O perfil deve ser PASSAGEIRO, GESTOR_SUPORTE, EMPRESA_ADMIN ou ADMIN.');
    erro.statusCode = 400;
    throw erro;
  }
  return normalizado;
}

export async function criarUtilizadorAdministrativo({ nome, apelido, telefone, palavraPasse, perfil = 'GESTOR_SUPORTE', empresaId }, administrador) {
  const dados = { nome: validarNome(nome), apelido: validarApelido(apelido), telefone: normalizarTelefone(telefone), perfil: validarPerfil(perfil) };
  dados.empresaId = validarVinculoCriacaoAdministrativa({ administrador, perfil: dados.perfil, empresaId });
  if (dados.perfil === 'EMPRESA_ADMIN') await garantirEmpresaDisponivel(dados.empresaId);
  validarPalavraPasse(palavraPasse);
  if (await User.findOne({ where: { telefone: dados.telefone } })) {
    const erro = new Error('Este número de telefone já está registado.'); erro.statusCode = 409; throw erro;
  }
  dados.palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
  return User.create(dados);
}

export async function actualizarUtilizadorAdministrativo(id, { nome, apelido, telefone, perfil, empresaId }, administrador) {
  const utilizador = await obterUtilizador(id, administrador);
  const alteracoes = {};
  if (nome !== undefined) alteracoes.nome = validarNome(nome);
  if (apelido !== undefined) alteracoes.apelido = validarApelido(apelido);
  if (telefone !== undefined) {
    alteracoes.telefone = normalizarTelefone(telefone);
    const existente = await User.findOne({ where: { telefone: alteracoes.telefone } });
    if (existente && String(existente.id) !== String(id)) {
      const erro = new Error('Este número de telefone já está registado.'); erro.statusCode = 409; throw erro;
    }
  }
  if (perfil !== undefined) {
    alteracoes.perfil = validarPerfil(perfil);
    if (administrador.perfil === 'EMPRESA_ADMIN' && !['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(alteracoes.perfil)) {
      const erro = new Error('Não pode atribuir este perfil dentro da empresa.'); erro.statusCode = 403; throw erro;
    }
    if (administrador.perfil === 'ADMIN' && !['ADMIN', 'EMPRESA_ADMIN'].includes(alteracoes.perfil)) {
      const erro = new Error('O administrador da plataforma só pode gerir administradores da plataforma ou das empresas.'); erro.statusCode = 403; throw erro;
    }
    const perfilAdministrador = administrador.perfil === 'EMPRESA_ADMIN' ? 'EMPRESA_ADMIN' : 'ADMIN';
    if (String(id) === String(administrador.id) && alteracoes.perfil !== perfilAdministrador) {
      const erro = new Error('Não pode remover o seu próprio perfil de administrador.'); erro.statusCode = 409; throw erro;
    }
  }
  const perfilFinal = alteracoes.perfil || utilizador.perfil;
  if (administrador.perfil === 'ADMIN') {
    if (perfilFinal === 'EMPRESA_ADMIN') {
      alteracoes.empresaId = empresaId || utilizador.empresaId;
      await garantirEmpresaDisponivel(alteracoes.empresaId);
    } else if (perfilFinal === 'ADMIN') {
      alteracoes.empresaId = null;
    }
  }
  await utilizador.update(alteracoes);
  return utilizador;
}

export async function definirEstadoUtilizador(id, activo, administrador) {
  if (String(id) === String(administrador.id) && !activo) {
    const erro = new Error('Não pode desativar a sua própria conta.'); erro.statusCode = 409; throw erro;
  }
  const utilizador = await obterUtilizador(id, administrador);
  await utilizador.update({ activo: Boolean(activo) });
  return utilizador;
}

export async function redefinirPalavraPasse(id, novaPalavraPasse, administrador) {
  validarPalavraPasse(novaPalavraPasse);
  const utilizador = await obterUtilizador(id, administrador);
  await utilizador.update({ palavraPasseHash: await bcrypt.hash(novaPalavraPasse, 12) });
}

export function validarRemocaoUtilizador({ utilizadorId, administradorId, perfil, activo = true, totalAdministradoresActivos }) {
  if (String(utilizadorId) === String(administradorId)) {
    const erro = new Error('Não pode eliminar a sua própria conta.'); erro.statusCode = 409; throw erro;
  }
  if (perfil === 'ADMIN' && activo && totalAdministradoresActivos <= 0) {
    const erro = new Error('Não pode eliminar o último administrador ativo.'); erro.statusCode = 409; throw erro;
  }
}

export async function eliminarUtilizadorAdministrativo(id, administrador) {
  const utilizador = await obterUtilizador(id, administrador);
  const perfilAdministrativo = ['ADMIN', 'EMPRESA_ADMIN'].includes(utilizador.perfil);
  const outrosAdministradoresActivos = perfilAdministrativo
    ? await User.count({ where: {
      perfil: utilizador.perfil,
      ...(utilizador.perfil === 'EMPRESA_ADMIN' && { empresaId: utilizador.empresaId }),
      activo: true, eliminadoEm: null, id: { [Op.ne]: id }
    } })
    : 1;
  validarRemocaoUtilizador({
    utilizadorId: id,
    administradorId: administrador.id,
    perfil: perfilAdministrativo ? 'ADMIN' : utilizador.perfil,
    activo: utilizador.activo,
    totalAdministradoresActivos: outrosAdministradoresActivos
  });

  // O identificador anonimizado mantém a restrição única sem conservar o
  // telefone original e permite que esse número volte a ser registado.
  const identificador = createHash('sha256').update(`${id}:${Date.now()}`).digest('hex').slice(0, 16);
  await utilizador.update({
    nome: 'Conta',
    apelido: 'Eliminada',
    telefone: `DEL${identificador}`,
    email: null,
    activo: false,
    eliminadoEm: new Date()
  });
}

async function obterUtilizador(id, administrador = null) {
  const utilizador = await User.findByPk(id);
  if (!utilizador || utilizador.eliminadoEm) { const erro = new Error('Usuário não encontrado.'); erro.statusCode = 404; throw erro; }
  if (administrador?.perfil === 'EMPRESA_ADMIN' && String(utilizador.empresaId) !== String(administrador.empresaId)) {
    const erro = new Error('Não pode gerir usuários de outra empresa.'); erro.statusCode = 403; throw erro;
  }
  if (administrador?.perfil === 'ADMIN' && !['ADMIN', 'EMPRESA_ADMIN'].includes(utilizador.perfil)) {
    const erro = new Error('A gestão desta conta pertence à respetiva empresa ou ao próprio usuário.'); erro.statusCode = 403; throw erro;
  }
  return utilizador;
}

// Centraliza a regra de criação para impedir que um administrador empresarial
// crie contas noutra empresa e para exigir uma empresa ao administrador local.
export function validarVinculoCriacaoAdministrativa({ administrador, perfil, empresaId }) {
  if (administrador?.perfil === 'EMPRESA_ADMIN') {
    if (perfil !== 'GESTOR_SUPORTE') {
      const erro = new Error('O administrador da empresa só pode criar atendentes.'); erro.statusCode = 403; throw erro;
    }
    return administrador.empresaId;
  }
  if (administrador?.perfil === 'ADMIN') {
    if (!['ADMIN', 'EMPRESA_ADMIN'].includes(perfil)) {
      const erro = new Error('O administrador da plataforma só pode criar administradores da plataforma ou das empresas.'); erro.statusCode = 403; throw erro;
    }
    if (perfil === 'EMPRESA_ADMIN' && !empresaId) {
      const erro = new Error('Selecione a empresa do novo administrador.'); erro.statusCode = 400; throw erro;
    }
    return perfil === 'EMPRESA_ADMIN' ? empresaId : null;
  }
  const erro = new Error('Não possui permissão para criar usuários administrativos.'); erro.statusCode = 403; throw erro;
}

async function garantirEmpresaDisponivel(empresaId) {
  const empresa = await Empresa.findOne({ where: { id: empresaId, eliminadaEm: null } });
  if (!empresa) {
    const erro = new Error('A empresa selecionada não foi encontrada.'); erro.statusCode = 404; throw erro;
  }
  return empresa;
}

export { validarPerfil };
