import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { validarEmail, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

function validarPerfil(perfil) {
  const normalizado = String(perfil || '').toUpperCase();
  if (!['PASSAGEIRO', 'ADMIN'].includes(normalizado)) {
    const erro = new Error('O perfil deve ser PASSAGEIRO ou ADMIN.');
    erro.statusCode = 400;
    throw erro;
  }
  return normalizado;
}

export async function criarUtilizadorAdministrativo({ nome, email, palavraPasse, perfil = 'PASSAGEIRO' }) {
  const dados = { nome: validarNome(nome), email: validarEmail(email), perfil: validarPerfil(perfil) };
  validarPalavraPasse(palavraPasse);
  if (await User.findOne({ where: { email: dados.email } })) {
    const erro = new Error('Este email já está registado.'); erro.statusCode = 409; throw erro;
  }
  dados.palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
  return User.create(dados);
}

export async function actualizarUtilizadorAdministrativo(id, { nome, email, perfil }, administradorId) {
  const utilizador = await obterUtilizador(id);
  const alteracoes = {};
  if (nome !== undefined) alteracoes.nome = validarNome(nome);
  if (email !== undefined) {
    alteracoes.email = validarEmail(email);
    const existente = await User.findOne({ where: { email: alteracoes.email } });
    if (existente && String(existente.id) !== String(id)) {
      const erro = new Error('Este email já está registado.'); erro.statusCode = 409; throw erro;
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
