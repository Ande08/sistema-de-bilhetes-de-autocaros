import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { normalizarEmail, validarEmail, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

export class ServicoAutenticacao {
  async registar({ nome, email, palavraPasse }) {
    const nomeValidado = validarNome(nome);
    const emailValidado = validarEmail(email);
    validarPalavraPasse(palavraPasse);

    // O email é único para impedir contas duplicadas.
    const utilizadorExistente = await User.findOne({ where: { email: emailValidado } });
    if (utilizadorExistente) {
      const erro = new Error('Este email já está registado.');
      erro.statusCode = 409;
      throw erro;
    }

    // Nunca guardamos a palavra-passe original na base de dados.
    const palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
    const utilizador = await User.create({ nome: nomeValidado, email: emailValidado, palavraPasseHash });
    return this._dadosPublicos(utilizador);
  }

  async iniciarSessao({ email, palavraPasse }) {
    const utilizador = await User.findOne({ where: { email: normalizarEmail(email) } });
    const palavraPasseValida = utilizador && typeof palavraPasse === 'string'
      && await bcrypt.compare(palavraPasse, utilizador.palavraPasseHash);
    if (!palavraPasseValida) {
      const erro = new Error('Email ou palavra-passe inválidos.');
      erro.statusCode = 401;
      throw erro;
    }
    if (!utilizador.activo) {
      const erro = new Error('Esta conta encontra-se desativada. Contacte a administração.');
      erro.statusCode = 403;
      throw erro;
    }

    // O token identifica o utilizador nas próximas requisições.
    const token = jwt.sign(
      { id: utilizador.id, perfil: utilizador.perfil },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRACAO || '1d' }
    );

    return { token, utilizador: this._dadosPublicos(utilizador) };
  }

  async obterPerfil(utilizadorId) {
    const utilizador = await this._obterUtilizadorActivo(utilizadorId);
    return this._dadosPublicos(utilizador);
  }

  async actualizarPerfil(utilizadorId, { nome, email }) {
    const utilizador = await this._obterUtilizadorActivo(utilizadorId);
    const nomeValidado = validarNome(nome);
    const emailValidado = validarEmail(email);
    const emailEmUso = await User.findOne({ where: { email: emailValidado } });

    if (emailEmUso && String(emailEmUso.id) !== String(utilizador.id)) {
      const erro = new Error('Este email já está registado.');
      erro.statusCode = 409;
      throw erro;
    }

    await utilizador.update({ nome: nomeValidado, email: emailValidado });
    return this._dadosPublicos(utilizador);
  }

  async alterarPalavraPasse(utilizadorId, { palavraPasseActual, novaPalavraPasse }) {
    const utilizador = await this._obterUtilizadorActivo(utilizadorId);
    validarPalavraPasse(novaPalavraPasse);
    const palavraPasseValida = await bcrypt.compare(palavraPasseActual || '', utilizador.palavraPasseHash);
    if (!palavraPasseValida) {
      const erro = new Error('A palavra-passe atual está incorreta.');
      erro.statusCode = 401;
      throw erro;
    }
    const palavraPasseHash = await bcrypt.hash(novaPalavraPasse, 12);
    await utilizador.update({ palavraPasseHash });
  }

  async _obterUtilizadorActivo(utilizadorId) {
    const utilizador = await User.findByPk(utilizadorId);
    if (!utilizador || !utilizador.activo) {
      const erro = new Error('Utilizador não encontrado ou desativado.');
      erro.statusCode = 404;
      throw erro;
    }
    return utilizador;
  }

  _dadosPublicos(utilizador) {
    return { id: utilizador.id, nome: utilizador.nome, email: utilizador.email, perfil: utilizador.perfil, activo: utilizador.activo };
  }
}
