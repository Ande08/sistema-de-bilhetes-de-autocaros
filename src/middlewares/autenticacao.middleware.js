import jwt from 'jsonwebtoken';

export function exigirAutenticacao(req, _res, next) {
  try {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    if (!token) {
      const erro = new Error('Token de autenticação não fornecido.');
      erro.statusCode = 401;
      throw erro;
    }

    // O utilizador autenticado fica disponível para o controller em req.utilizador.
    req.utilizador = jwt.verify(token, process.env.JWT_SECRET || 'chave-apenas-para-desenvolvimento');
    return next();
  } catch (erro) {
    erro.statusCode = 401;
    return next(erro);
  }
}
