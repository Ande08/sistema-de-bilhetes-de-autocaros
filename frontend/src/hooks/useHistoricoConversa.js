import { useCallback, useEffect, useState } from 'react';

const LIMITE_MENSAGENS = 100;

function protegerTextoPersistido(texto) {
  return texto
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[e-mail removido]')
    .replace(/(?:\+?258)?[ -]?(?:8[234567])[ -]?\d{3}[ -]?\d{4}\b/g, '[telefone removido]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[número sensível removido]')
    .replace(/\b(?:sk-[a-z0-9_-]{12,}|bearer\s+[a-z0-9._-]{12,})\b/gi, '[segredo removido]');
}

// Mantém apenas texto e autor, limita o tamanho do histórico e impede que
// estruturas inesperadas sejam recuperadas do armazenamento do navegador.
export function normalizarHistoricoConversa(valor, mensagemInicial) {
  if (!Array.isArray(valor)) return [mensagemInicial];
  const mensagens = valor
    .filter((item) => item && typeof item.autor === 'string' && typeof item.texto === 'string')
    .map((item) => ({ autor: item.autor.slice(0, 30), texto: protegerTextoPersistido(item.texto.slice(0, 4000)) }))
    .slice(-LIMITE_MENSAGENS);
  return mensagens.length ? mensagens : [mensagemInicial];
}

function lerHistorico(chave, mensagemInicial) {
  try {
    const guardado = globalThis.localStorage?.getItem(chave);
    return guardado ? normalizarHistoricoConversa(JSON.parse(guardado), mensagemInicial) : [mensagemInicial];
  } catch {
    return [mensagemInicial];
  }
}

export default function useHistoricoConversa(chave, mensagemInicial) {
  const [mensagens, setMensagens] = useState(() => lerHistorico(chave, mensagemInicial));

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(chave, JSON.stringify(normalizarHistoricoConversa(mensagens, mensagemInicial)));
    } catch {
      // O chat continua funcional quando o navegador bloqueia armazenamento.
    }
  }, [chave, mensagens, mensagemInicial]);

  const limpar = useCallback(() => {
    try { globalThis.localStorage?.removeItem(chave); } catch { /* sem ação */ }
    setMensagens([mensagemInicial]);
  }, [chave, mensagemInicial]);

  return { mensagens, setMensagens, limpar };
}
