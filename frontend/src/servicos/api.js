const URL_API = import.meta.env.VITE_URL_API || 'http://localhost:3000/api';
const CHAVE_SESSAO = 'sessao_sistema_bilhetes';

export function obterSessaoGuardada() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) || null;
  } catch {
    return null;
  }
}

export function guardarSessao(sessao) {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

export function terminarSessao() {
  localStorage.removeItem(CHAVE_SESSAO);
}

// Função central para manter o tratamento das respostas da API consistente.
async function requisicao(caminho, opcoes = {}) {
  const token = obterSessaoGuardada()?.token;
  const resposta = await fetch(`${URL_API}${caminho}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opcoes.headers
    },
    ...opcoes
  });
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.message || corpo.mensagem || 'Ocorreu um erro na operação.');
  return corpo.dados;
}

export function registarUtilizador(dados) {
  return requisicao('/autenticacao/registar', { method: 'POST', body: JSON.stringify(dados) });
}

export function iniciarSessao(dados) {
  return requisicao('/autenticacao/iniciar-sessao', { method: 'POST', body: JSON.stringify(dados) });
}

export function obterPerfil() {
  return requisicao('/autenticacao/perfil');
}

export function actualizarPerfil(dados) {
  return requisicao('/autenticacao/perfil', { method: 'PUT', body: JSON.stringify(dados) });
}

export function alterarPalavraPasse(dados) {
  return requisicao('/autenticacao/palavra-passe', { method: 'PUT', body: JSON.stringify(dados) });
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
