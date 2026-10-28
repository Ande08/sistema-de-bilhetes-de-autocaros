// A administração da plataforma não executa operações comerciais das empresas.
export function exigirAdministradorPlataforma(req, _res, next) {
  if (req.utilizador?.perfil !== 'ADMIN') {
    const erro = new Error('Acesso permitido apenas ao administrador da plataforma.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}

// Alias mantido para não quebrar imports existentes durante a evolução da API.
export const exigirAdministrador = exigirAdministradorPlataforma;

export function exigirAdministradorEmpresa(req, _res, next) {
  if (req.utilizador?.perfil !== 'EMPRESA_ADMIN') {
    const erro = new Error('Acesso permitido apenas ao administrador da empresa.');
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
  if (!['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(req.utilizador?.perfil)) {
    const erro = new Error('Acesso permitido apenas a atendentes ou administradores da empresa.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}

// Clientes compram para si; atendentes e administradores empresariais podem
// executar a venda assistida. O administrador global fica fora deste fluxo.
export function exigirClienteOuOperadorEmpresa(req, _res, next) {
  if (!['PASSAGEIRO', 'GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(req.utilizador?.perfil)) {
    const erro = new Error('O administrador da plataforma não executa operações de venda.');
    erro.statusCode = 403;
    return next(erro);
  }
  return next();
}
