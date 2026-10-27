export function filtroEmpresa(utilizador) {
  if (utilizador?.perfil === 'ADMIN') return {};
  if (!utilizador?.empresaId) {
    const erro = new Error('A conta operacional não está associada a uma empresa.');
    erro.statusCode = 403;
    throw erro;
  }
  return { empresaId: utilizador.empresaId };
}

export function obterEmpresaParaCriacao(utilizador) {
  if (!utilizador?.empresaId) {
    const erro = new Error('Associe esta conta a uma empresa antes de criar dados operacionais.');
    erro.statusCode = 409;
    throw erro;
  }
  return utilizador.empresaId;
}

export function garantirMesmaEmpresa(utilizador, entidade) {
  if (utilizador?.perfil === 'ADMIN') return;
  if (!entidade || String(entidade.empresaId) !== String(utilizador?.empresaId)) {
    const erro = new Error('Não tem permissão para operar dados de outra empresa.');
    erro.statusCode = 403;
    throw erro;
  }
}
