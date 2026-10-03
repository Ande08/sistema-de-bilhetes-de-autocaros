const URL_API = import.meta.env.VITE_URL_API || 'http://localhost:3000/api';
export const URL_SERVIDOR = URL_API.replace(/\/api\/?$/, '');
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

export function obterResumoConta() {
  return requisicao('/conta/resumo');
}

export function cancelarBilhete(codigo) {
  return requisicao(`/bilhetes/${encodeURIComponent(codigo)}/cancelar`, { method: 'PATCH' });
}

export function obterPainelAdministrativo() {
  return requisicao('/gestao/painel');
}

export function criarAutocarro(dados) {
  return requisicao('/gestao/autocarros', { method: 'POST', body: JSON.stringify(dados) });
}

export function criarRota(dados) {
  return requisicao('/gestao/rotas', { method: 'POST', body: JSON.stringify(dados) });
}

export function criarViagem(dados) {
  return requisicao('/gestao/viagens', { method: 'POST', body: JSON.stringify(dados) });
}

export function definirEstadoAdministrativo(tipo, id, activo) {
  return requisicao(`/gestao/${tipo}/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
}

export function actualizarViagemAdministrativa(id, dados) {
  return requisicao(`/gestao/viagens/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function cancelarViagemAdministrativa(id) {
  return requisicao(`/viagens/${id}/cancelar`, { method: 'PATCH' });
}

export function criarUtilizadorAdministrativo(dados) {
  return requisicao('/gestao/utilizadores', { method: 'POST', body: JSON.stringify(dados) });
}

export function actualizarUtilizadorAdministrativo(id, dados) {
  return requisicao(`/gestao/utilizadores/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function redefinirPalavraPasseAdministrativa(id, novaPalavraPasse) {
  return requisicao(`/gestao/utilizadores/${id}/palavra-passe`, { method: 'PUT', body: JSON.stringify({ novaPalavraPasse }) });
}

export function consultarAssistenteSuporte(mensagem) {
  return requisicao('/suporte/assistente', { method: 'POST', body: JSON.stringify({ mensagem }) });
}

export function listarTicketsSuporte() {
  return requisicao('/suporte/tickets');
}

export function criarTicketSuporte(dados) {
  return requisicao('/suporte/tickets', { method: 'POST', body: JSON.stringify(dados) });
}

export function obterTicketSuporte(id) {
  return requisicao(`/suporte/tickets/${id}`);
}

export function enviarMensagemSuporte(id, mensagem) {
  return requisicao(`/suporte/tickets/${id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem }) });
}

export function actualizarEstadoTicketSuporte(id, estado) {
  return requisicao(`/suporte/tickets/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });
}

export function listarGestoresSuporte() {
  return requisicao('/suporte/gestores');
}

export function atribuirTicketSuporte(id, gestorId) {
  return requisicao(`/suporte/tickets/${id}/atribuir`, { method: 'PATCH', body: JSON.stringify({ gestorId }) });
}
