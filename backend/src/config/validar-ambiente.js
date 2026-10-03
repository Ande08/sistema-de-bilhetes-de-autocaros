// Interrompe a aplicação cedo quando uma configuração essencial está ausente.
export function validarVariaveisAmbiente() {
  const obrigatorias = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
  const ausentes = obrigatorias.filter((nome) => !process.env[nome]?.trim());

  if (ausentes.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${ausentes.join(', ')}`);
  }

  if (process.env.JWT_SECRET === 'alterar_esta_chave') {
    throw new Error('JWT_SECRET deve ser substituída por uma chave segura no ficheiro .env.');
  }
}
