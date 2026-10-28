import jwt from 'jsonwebtoken';
import { Empresa, User } from '../models/index.js';

export async function exigirAutenticacao(req, _res, next) {
  try {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    if (!token) {
      const erro = new Error('Token de autenticação não fornecido.');
      erro.statusCode = 401;
      throw erro;
    }

    const identidade = jwt.verify(token, process.env.JWT_SECRET);
    const utilizador = await User.findByPk(identidade.id, {
      attributes: ['id', 'perfil', 'empresaId', 'activo', 'eliminadoEm'],
      include: [{ model: Empresa, attributes: ['id', 'activa', 'estadoCadastro', 'eliminadaEm'], required: false }]
    });
    if (!utilizador || !utilizador.activo || utilizador.eliminadoEm) {
      throw new Error('Usuário não encontrado ou desativado.');
    }
    if (utilizador.empresaId && (!utilizador.Empresa?.activa || utilizador.Empresa?.estadoCadastro !== 'APROVADA' || utilizador.Empresa?.eliminadaEm)) {
      throw new Error('A empresa associada a esta conta encontra-se desativada.');
    }

    // Usa sempre os dados atuais da base de dados. Assim, uma desativação
    // produz efeito imediato mesmo que o token ainda não tenha expirado.
    req.utilizador = {
      id: utilizador.id,
      perfil: utilizador.perfil,
      empresaId: utilizador.empresaId || null
    };
    return next();
  } catch (erro) {
    erro.statusCode = 401;
    return next(erro);
  }
}
