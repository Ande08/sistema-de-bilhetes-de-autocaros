// Permite o acesso apenas a utilizadores autenticados com perfil ADMIN.
export function exigirAdministrador(req, _res, next) {
  if (req.utilizador?.perfil !== 'ADMIN') {
    const erro = new Error('Acesso permitido apenas a administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}
