const URL_API = import.meta.env.VITE_URL_API || 'http://localhost:3000/api';

// Função central para manter o tratamento das respostas da API consistente.
async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_API}${caminho}`, {
    headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    ...opcoes
  });
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.message || corpo.mensagem || 'Ocorreu um erro na operação.');
  return corpo.dados;
}

export function pesquisarViagens(filtros) {
  const parametros = new URLSearchParams(filtros);
  return requisicao(`/viagens?${parametros}`);
}

export function listarAssentos(viagemId) {
  return requisicao(`/viagens/${viagemId}/assentos`);
}

export function comprarBilhete(dados) {
  return requisicao('/compras', { method: 'POST', body: JSON.stringify(dados) });
}
