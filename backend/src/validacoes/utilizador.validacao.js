// Reúne as regras de validação de utilizadores para que controllers e serviços
// apresentem sempre as mesmas mensagens ao passageiro.
export function validarNome(nome) {
  const nomeNormalizado = String(nome || '').trim().replace(/\s+/g, ' ');
  if (nomeNormalizado.length < 2 || nomeNormalizado.length > 80) {
    const erro = new Error('O nome deve ter entre 2 e 80 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }
  return nomeNormalizado;
}

export function validarApelido(apelido) {
  const normalizado = String(apelido || '').trim().replace(/\s+/g, ' ');
  if (normalizado.length < 2 || normalizado.length > 120) {
    const erro = new Error('O apelido deve ter entre 2 e 120 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }
  return normalizado;
}

export function normalizarTelefone(telefone = '') {
  let digitos = String(telefone).replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.length === 9) digitos = `258${digitos}`;
  const normalizado = `+${digitos}`;
  if (!/^\+2588[2-7]\d{7}$/.test(normalizado)) {
    const erro = new Error('Informe um número de telefone moçambicano válido.');
    erro.statusCode = 400;
    throw erro;
  }
  return normalizado;
}

export function validarPalavraPasse(palavraPasse) {
  if (typeof palavraPasse !== 'string' || palavraPasse.length < 8) {
    const erro = new Error('A palavra-passe deve ter pelo menos 8 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }
  return palavraPasse;
}
