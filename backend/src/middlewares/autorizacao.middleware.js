// Permite o acesso apenas a utilizadores autenticados com perfil ADMIN.
export function exigirAdministrador(req, _res, next) {
  if (req.utilizador?.perfil !== 'ADMIN') {
    const erro = new Error('Acesso permitido apenas a administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}

// Administradores da plataforma e proprietários de empresa usam o painel de
// gestão, mas os serviços aplicam o filtro da empresa em todas as consultas.
export function exigirAdministradorEmpresaOuPlataforma(req, _res, next) {
  if (!['ADMIN', 'EMPRESA_ADMIN'].includes(req.utilizador?.perfil)) {
    const erro = new Error('Acesso permitido apenas a administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}

// Atendentes podem operar vendas e suporte, mas não recebem acesso administrativo.
export function exigirAtendenteOuAdministrador(req, _res, next) {
  if (!['GESTOR_SUPORTE', 'EMPRESA_ADMIN', 'ADMIN'].includes(req.utilizador?.perfil)) {
    const erro = new Error('Acesso permitido apenas a atendentes ou administradores.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}
