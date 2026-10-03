import { beforeEach, describe, expect, it, vi } from 'vitest';
import { comprarBilhete, guardarSessao, obterSessaoGuardada, terminarSessao } from './api.js';

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

  it('envia a compra com o token da sessão', async () => {
    guardarSessao({ token: 'token-teste' });
    const resposta = { dados: { bilhete: { codigo: 'BIL-1' } } };
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => resposta });
    vi.stubGlobal('fetch', fetchSimulado);

    await comprarBilhete({ viagemId: 1, assentoId: 2, metodoPagamento: 'MPESA' });

    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/compras'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer token-teste' })
    }));
  });
});
