import { describe, expect, it } from 'vitest';
import { normalizarHistoricoConversa } from './useHistoricoConversa.js';

const inicial = { autor: 'IA', texto: 'Olá' };

describe('histórico persistente da conversa', () => {
  it('recusa conteúdo inválido e conserva a mensagem inicial', () => {
    expect(normalizarHistoricoConversa({ texto: 'inválido' }, inicial)).toEqual([inicial]);
  });

  it('guarda apenas autor e texto e limita o histórico a cem mensagens', () => {
    const itens = Array.from({ length: 105 }, (_, indice) => ({ autor: 'IA', texto: `Mensagem ${indice}`, segredo: 'ignorado' }));
    const resultado = normalizarHistoricoConversa(itens, inicial);
    expect(resultado).toHaveLength(100);
    expect(resultado[0]).toEqual({ autor: 'IA', texto: 'Mensagem 5' });
    expect(resultado[0]).not.toHaveProperty('segredo');
  });

  it('remove contactos, cartões e chaves antes de persistir', () => {
    const [resultado] = normalizarHistoricoConversa([{
      autor: 'PASSAGEIRO',
      texto: 'email pessoa@teste.com telefone +258 84 123 4567 cartão 4242 4242 4242 4242 chave sk-teste123456789'
    }], inicial);
    expect(resultado.texto).not.toContain('pessoa@teste.com');
    expect(resultado.texto).not.toContain('84 123 4567');
    expect(resultado.texto).not.toContain('4242 4242 4242 4242');
    expect(resultado.texto).not.toContain('sk-teste123456789');
  });
});
