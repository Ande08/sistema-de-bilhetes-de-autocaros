const URL_OPENROUTER = 'https://openrouter.ai/api/v1';

export async function solicitarConclusaoOpenRouter({ apiKey, modelo, mensagens, maxTokens = 350 }) {
  if (!apiKey) throw erroIntegracao('Configure uma chave da OpenRouter antes de utilizar a inteligência artificial.', 400);
  const resposta = await fetch(`${URL_OPENROUTER}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      'X-Title': 'Viagem Bus'
    },
    body: JSON.stringify({ model: modelo, messages: mensagens, max_tokens: maxTokens, temperature: 0.3 }),
    signal: AbortSignal.timeout(20000)
  }).catch((erro) => { throw erroIntegracao(erro.name === 'TimeoutError' ? 'A OpenRouter demorou demasiado para responder.' : 'Não foi possível contactar a OpenRouter.'); });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw erroIntegracao(corpo.error?.message || `A OpenRouter recusou o pedido (${resposta.status}).`);
  const conteudo = corpo.choices?.[0]?.message?.content?.trim();
  if (!conteudo) throw erroIntegracao('A OpenRouter devolveu uma resposta vazia.');
  return { conteudo, modelo: corpo.model || modelo };
}

export async function obterModelosOpenRouter(apiKey) {
  const resposta = await fetch(`${URL_OPENROUTER}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(15000)
  }).catch(() => null);
  if (!resposta?.ok) return null;
  const corpo = await resposta.json().catch(() => ({}));
  return Array.isArray(corpo.data) ? corpo.data : null;
}

function erroIntegracao(mensagem, statusCode = 502) { const erro = new Error(mensagem); erro.statusCode = statusCode; return erro; }
