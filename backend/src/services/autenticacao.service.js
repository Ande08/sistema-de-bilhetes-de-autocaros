import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export class ServicoAutenticacao {
  async registar({ nome, email, palavraPasse }) {
    // O email é único para impedir contas duplicadas.
    const utilizadorExistente = await User.findOne({ where: { email } });
    if (utilizadorExistente) {
      const erro = new Error('Este email já está registado.');
      erro.statusCode = 409;
      throw erro;
    }

    // Nunca guardamos a palavra-passe original na base de dados.
    const palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
    const utilizador = await User.create({ nome, email, palavraPasseHash });
    return this._dadosPublicos(utilizador);
  }

  async iniciarSessao({ email, palavraPasse }) {
    const utilizador = await User.findOne({ where: { email } });
    const palavraPasseValida = utilizador && await bcrypt.compare(palavraPasse, utilizador.palavraPasseHash);
    if (!palavraPasseValida) {
      const erro = new Error('Email ou palavra-passe inválidos.');
      erro.statusCode = 401;
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

  _dadosPublicos(utilizador) {
    return { id: utilizador.id, nome: utilizador.nome, email: utilizador.email, perfil: utilizador.perfil };
  }
}
