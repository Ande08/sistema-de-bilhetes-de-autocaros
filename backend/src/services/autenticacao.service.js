import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Empresa, User } from '../models/index.js';
import { normalizarTelefone, validarApelido, validarNome, validarPalavraPasse } from '../validacoes/utilizador.validacao.js';

export class ServicoAutenticacao {
  async iniciarSessao({ telefone, palavraPasse }) {
    const utilizador = await User.findOne({
      where: { telefone: normalizarTelefone(telefone) },
      include: [{ model: Empresa, attributes: ['id', 'nome', 'slug', 'logoUrl', 'activa', 'estadoCadastro', 'motivoEstado', 'eliminadaEm'] }]
    });
    const palavraPasseValida = utilizador && typeof palavraPasse === 'string'
      && await bcrypt.compare(palavraPasse, utilizador.palavraPasseHash);
    if (!palavraPasseValida) {
      const erro = new Error('Número de telefone ou palavra-passe inválidos.');
      erro.statusCode = 401;
      throw erro;
    }
    if (!utilizador.activo) {
      const erro = new Error('Esta conta encontra-se desativada. Contacte a administração.');
      erro.statusCode = 403;
      throw erro;
    }
    if (utilizador.empresaId && (!utilizador.Empresa?.activa || utilizador.Empresa?.eliminadaEm || utilizador.Empresa?.estadoCadastro !== 'APROVADA')) {
      const mensagens = {
        PENDENTE: 'O cadastro da empresa está pendente de aprovação.',
        REJEITADA: `O cadastro da empresa foi rejeitado${utilizador.Empresa?.motivoEstado ? `: ${utilizador.Empresa.motivoEstado}` : '.'}`,
        SUSPENSA: 'A empresa associada a esta conta encontra-se suspensa.'
      };
      const erro = new Error(mensagens[utilizador.Empresa?.estadoCadastro] || 'A empresa associada a esta conta encontra-se desativada.');
      erro.statusCode = 403;
      throw erro;
    }

    // O token identifica o usuário nas próximas requisições.
    const token = jwt.sign(
      { id: utilizador.id, perfil: utilizador.perfil, empresaId: utilizador.empresaId || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRACAO || '1d' }
    );

    return { token, utilizador: this._dadosPublicos(utilizador) };
  }

  async obterPerfil(utilizadorId) {
    const utilizador = await this._obterUtilizadorActivo(utilizadorId);
    return this._dadosPublicos(utilizador);
  }

  async actualizarPerfil(utilizadorId, { nome, apelido }) {
    const utilizador = await this._obterUtilizadorActivo(utilizadorId);
    const nomeValidado = validarNome(nome);
    const apelidoValidado = validarApelido(apelido);
    await utilizador.update({ nome: nomeValidado, apelido: apelidoValidado });
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
    const utilizador = await User.findByPk(utilizadorId, {
      include: [{ model: Empresa, attributes: ['id', 'nome', 'slug', 'logoUrl', 'activa', 'estadoCadastro', 'motivoEstado', 'eliminadaEm'] }]
    });
    if (!utilizador || !utilizador.activo) {
      const erro = new Error('Usuário não encontrado ou desativado.');
      erro.statusCode = 404;
      throw erro;
    }
    if (utilizador.empresaId && (!utilizador.Empresa?.activa || utilizador.Empresa?.eliminadaEm || utilizador.Empresa?.estadoCadastro !== 'APROVADA')) {
      const erro = new Error('A empresa associada a esta conta encontra-se desativada.');
      erro.statusCode = 403;
      throw erro;
    }
    return utilizador;
  }

  _dadosPublicos(utilizador) {
    return {
      id: utilizador.id,
      nome: utilizador.nome,
      apelido: utilizador.apelido,
      nomeCompleto: `${utilizador.nome} ${utilizador.apelido}`,
      telefone: utilizador.telefone,
      perfil: utilizador.perfil,
      empresaId: utilizador.empresaId || null,
      empresa: utilizador.Empresa ? {
        id: utilizador.Empresa.id, nome: utilizador.Empresa.nome,
        slug: utilizador.Empresa.slug, logoUrl: utilizador.Empresa.logoUrl || null
      } : null,
      activo: utilizador.activo
    };
  }
}
