// Permite o acesso apenas a utilizadores autenticados com perfil ADMIN.
export function exigirAdministrador(req, _res, next) {
  if (req.utilizador?.perfil !== 'ADMIN') {
    const erro = new Error('Acesso permitido apenas a administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}

// Atendentes podem operar vendas e suporte, mas não recebem acesso administrativo.
export function exigirAtendenteOuAdministrador(req, _res, next) {
  if (!['GESTOR_SUPORTE', 'ADMIN'].includes(req.utilizador?.perfil)) {
    const erro = new Error('Acesso permitido apenas a atendentes ou administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}
