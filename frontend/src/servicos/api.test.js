import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guardarSessao, obterSessaoGuardada, terminarSessao } from './api.js';

describe('sessão do passageiro', () => {
  beforeEach(() => {
    const dados = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (chave) => dados.get(chave) || null,
      setItem: (chave, valor) => dados.set(chave, valor),
      removeItem: (chave) => dados.delete(chave)
    });
  });

  it('guarda e recupera a sessão autenticada', () => {
    const sessao = { token: 'token-teste', utilizador: { nome: 'Ico Tiago' } };
    guardarSessao(sessao);
    expect(obterSessaoGuardada()).toEqual(sessao);
  });

  it('remove a sessão ao terminar', () => {
    guardarSessao({ token: 'token-teste' });
    terminarSessao();
    expect(obterSessaoGuardada()).toBeNull();
  });
});
