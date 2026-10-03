// Reúne as regras de validação de utilizadores para que controllers e serviços
// apresentem sempre as mesmas mensagens ao passageiro.
export function normalizarEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function validarEmail(email) {
  const emailNormalizado = normalizarEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    const erro = new Error('Informe um endereço de email válido.');
    erro.statusCode = 400;
    throw erro;
  }
  return emailNormalizado;
}

export function validarNome(nome) {
  const nomeNormalizado = String(nome || '').trim().replace(/\s+/g, ' ');
  if (nomeNormalizado.length < 3 || nomeNormalizado.length > 120) {
    const erro = new Error('O nome deve ter entre 3 e 120 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }
  return nomeNormalizado;
}

export function validarPalavraPasse(palavraPasse) {
  if (typeof palavraPasse !== 'string' || palavraPasse.length < 8) {
    const erro = new Error('A palavra-passe deve ter pelo menos 8 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }
  return palavraPasse;
}
