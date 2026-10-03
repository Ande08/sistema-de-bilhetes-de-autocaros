import { beforeEach, describe, expect, it, vi } from 'vitest';
import { comprarBilhete, confirmarRegistoUtilizador, guardarSessao, obterResumoConta, obterSessaoGuardada, registarUtilizador, terminarSessao } from './api.js';

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

  it('consulta o resumo da conta autenticada', async () => {
    guardarSessao({ token: 'token-resumo' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { totalBilhetesActivos: 2 } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    const resumo = await obterResumoConta();

    expect(resumo.totalBilhetesActivos).toBe(2);
    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/conta/resumo'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-resumo' }) }));
  });

  it('solicita e confirma o cadastro através de OTP', async () => {
    const fetchSimulado = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { telefone: '+258841234567' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { id: 5 } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await registarUtilizador({ nome: 'Ico', apelido: 'Tiago', telefone: '841234567', palavraPasse: 'segura123', canal: 'WHATSAPP' });
    await confirmarRegistoUtilizador({ telefone: '+258841234567', codigo: '123456' });

    expect(fetchSimulado.mock.calls[0][0]).toContain('/autenticacao/solicitar-registo');
    expect(fetchSimulado.mock.calls[1][0]).toContain('/autenticacao/confirmar-registo');
  });
});
