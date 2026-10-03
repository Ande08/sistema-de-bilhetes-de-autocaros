import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

function validarPerfil(perfil) {
  const normalizado = String(perfil || '').toUpperCase();
  if (!['PASSAGEIRO', 'GESTOR_SUPORTE', 'ADMIN'].includes(normalizado)) {
    const erro = new Error('O perfil deve ser PASSAGEIRO, GESTOR_SUPORTE ou ADMIN.');
    erro.statusCode = 400;
    throw erro;
  }
  return normalizado;
}

export async function criarUtilizadorAdministrativo({ nome, apelido, telefone, palavraPasse, perfil = 'PASSAGEIRO' }) {
  const dados = { nome: validarNome(nome), apelido: validarApelido(apelido), telefone: normalizarTelefone(telefone), perfil: validarPerfil(perfil) };
  validarPalavraPasse(palavraPasse);
  if (await User.findOne({ where: { telefone: dados.telefone } })) {
    const erro = new Error('Este número de telefone já está registado.'); erro.statusCode = 409; throw erro;
  }
  dados.palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
  return User.create(dados);
}

export async function actualizarUtilizadorAdministrativo(id, { nome, apelido, telefone, perfil }, administradorId) {
  const utilizador = await obterUtilizador(id);
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
    if (String(id) === String(administradorId) && alteracoes.perfil !== 'ADMIN') {
      const erro = new Error('Não pode remover o seu próprio perfil de administrador.'); erro.statusCode = 409; throw erro;
    }
  }
  await utilizador.update(alteracoes);
  return utilizador;
}

export async function definirEstadoUtilizador(id, activo, administradorId) {
  if (String(id) === String(administradorId) && !activo) {
    const erro = new Error('Não pode desativar a sua própria conta.'); erro.statusCode = 409; throw erro;
  }
  const utilizador = await obterUtilizador(id);
  await utilizador.update({ activo: Boolean(activo) });
  return utilizador;
}

export async function redefinirPalavraPasse(id, novaPalavraPasse) {
  validarPalavraPasse(novaPalavraPasse);
  const utilizador = await obterUtilizador(id);
  await utilizador.update({ palavraPasseHash: await bcrypt.hash(novaPalavraPasse, 12) });
}

async function obterUtilizador(id) {
  const utilizador = await User.findByPk(id);
  if (!utilizador) { const erro = new Error('Utilizador não encontrado.'); erro.statusCode = 404; throw erro; }
  return utilizador;
}

export { validarPerfil };
