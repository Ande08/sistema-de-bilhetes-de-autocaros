import { beforeEach, describe, expect, it, vi } from 'vitest';
import { comprarBilhete, confirmarRegistoUtilizador, enviarMensagemSuporte, guardarConfiguracaoIa, guardarSessao, iniciarPagamentoSimulado, listarClientesAtendimento, obterResumoConta, obterSessaoGuardada, processarPagamentoSimulado, registarUtilizador, terminarSessao } from './api.js';

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

  it('inicia e processa uma transação na API falsa de pagamentos', async () => {
    guardarSessao({ token: 'token-pagamento' });
    const fetchSimulado = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { referencia: 'SIM-MPESA-1', estado: 'PENDENTE' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { referencia: 'SIM-MPESA-1', estado: 'APROVADO' } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    const iniciada = await iniciarPagamentoSimulado({ viagemId: 1, metodo: 'MPESA', dadosPagamento: { telefone: '841234567' } });
    const aprovada = await processarPagamentoSimulado(iniciada.referencia);

    expect(iniciada.estado).toBe('PENDENTE');
    expect(aprovada.estado).toBe('APROVADO');
    expect(fetchSimulado.mock.calls[1][0]).toContain('/pagamentos-simulados/SIM-MPESA-1/processar');
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

  it('permite ao atendente consultar clientes para uma venda assistida', async () => {
    guardarSessao({ token: 'token-atendente' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: [{ id: 2, nome: 'Cliente' }] }) });
    vi.stubGlobal('fetch', fetchSimulado);

    const clientes = await listarClientesAtendimento('Cliente');

    expect(clientes).toHaveLength(1);
    expect(fetchSimulado.mock.calls[0][0]).toContain('/atendimento/clientes?pesquisa=Cliente');
  });

  it('envia texto e imagem numa mensagem de suporte', async () => {
    guardarSessao({ token: 'token-suporte' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { id: 8, imagemUrl: '/ficheiros/suporte/imagem.png' } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await enviarMensagemSuporte(3, 'Imagem do problema', { nome: 'problema.png', dados: 'data:image/png;base64,AA==' });

    const opcoes = fetchSimulado.mock.calls[0][1];
    expect(fetchSimulado.mock.calls[0][0]).toContain('/suporte/tickets/3/mensagens');
    expect(JSON.parse(opcoes.body)).toEqual({ mensagem: 'Imagem do problema', imagem: { nome: 'problema.png', dados: 'data:image/png;base64,AA==' } });
  });

  it('guarda a configuração de IA apenas pela rota administrativa', async () => {
    guardarSessao({ token: 'token-administrador' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { modelo: 'deepseek/deepseek-chat', apiKeyConfigurada: true } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await guardarConfiguracaoIa({ modelo: 'deepseek/deepseek-chat', activo: true, apiKey: 'sk-or-v1-teste' });

    expect(fetchSimulado.mock.calls[0][0]).toContain('/gestao/ia/configuracao');
    expect(fetchSimulado.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bearer token-administrador' }) }));
  });
});
