import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarEmpresaAdministrativa, comprarBilhete, confirmarRecuperacaoPalavraPasse, confirmarRegistoUtilizador, decidirCadastroEmpresaAdministrativa, definirEstadoEmpresaAdministrativa, editarEmpresaAdministrativa, eliminarEmpresaAdministrativa, eliminarUtilizadorAdministrativo, enviarAvisoViagemAdministrativa, enviarMensagemSuporte, guardarConfiguracaoIa, guardarSessao, iniciarPagamentoSimulado, libertarReservaAssento, listarClientesAtendimento, listarLocalidades, obterBilhetePdf, obterResumoConta, obterSessaoGuardada, pesquisarViagens, processarPagamentoSimulado, registarUtilizador, reservarAssento, solicitarRecuperacaoPalavraPasse, terminarSessao } from './api.js';

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

  it('reserva e liberta um assento pela API autenticada', async () => {
    guardarSessao({ token: 'token-assento' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { assentoId: 9 } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await reservarAssento(4, 9);
    await libertarReservaAssento(4, 9);

    expect(fetchSimulado.mock.calls[0][0]).toContain('/viagens/4/assentos/9/reservar');
    expect(fetchSimulado.mock.calls[0][1].method).toBe('POST');
    expect(fetchSimulado.mock.calls[1][1].method).toBe('DELETE');
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

  it('envia o cadastro de empresa para aprovação através de OTP', async () => {
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { telefone: '+258841234567', canal: 'WHATSAPP' } }) });
    vi.stubGlobal('fetch', fetchSimulado);
    await registarUtilizador({ tipoConta: 'EMPRESA', empresaNome: 'Transportes Sul', nome: 'Ana', apelido: 'Mabote', telefone: '841234567', palavraPasse: 'segura123', canal: 'WHATSAPP' });
    expect(JSON.parse(fetchSimulado.mock.calls[0][1].body)).toEqual(expect.objectContaining({ tipoConta: 'EMPRESA', empresaNome: 'Transportes Sul' }));
  });

  it('solicita e confirma a recuperação da palavra-passe através de OTP', async () => {
    const fetchSimulado = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { telefone: '+258841234567' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dados: { mensagem: 'Palavra-passe redefinida com sucesso.' } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await solicitarRecuperacaoPalavraPasse({ telefone: '841234567', canal: 'WHATSAPP' });
    await confirmarRecuperacaoPalavraPasse({ telefone: '+258841234567', codigo: '123456', novaPalavraPasse: 'novaSegura123' });

    expect(fetchSimulado.mock.calls[0][0]).toContain('/autenticacao/solicitar-recuperacao');
    expect(fetchSimulado.mock.calls[1][0]).toContain('/autenticacao/confirmar-recuperacao');
  });

  it('descarrega o PDF autenticado do bilhete', async () => {
    guardarSessao({ token: 'token-pdf' });
    const ficheiro = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, blob: async () => ficheiro });
    vi.stubGlobal('fetch', fetchSimulado);

    const resposta = await obterBilhetePdf('BIL-1');

    expect(resposta.type).toBe('application/pdf');
    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/compras/bilhete/BIL-1/pdf'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-pdf' })
    }));
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

  it('guarda os dados e o logótipo da empresa autenticada', async () => {
    guardarSessao({ token: 'token-empresa' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { nome: 'Empresa Teste', logoUrl: '/ficheiros/empresas/logo.png' } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await actualizarEmpresaAdministrativa({ nome: 'Empresa Teste', logo: { nome: 'logo.png', dados: 'data:image/png;base64,AA==' } });

    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/gestao/empresa'), expect.objectContaining({
      method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bearer token-empresa' })
    }));
  });

  it('edita, desativa e elimina uma empresa pela gestão da plataforma', async () => {
    guardarSessao({ token: 'token-administrador' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { id: 7 } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await editarEmpresaAdministrativa(7, { nome: 'Transportes Atualizados' });
    await definirEstadoEmpresaAdministrativa(7, false);
    await eliminarEmpresaAdministrativa(7);

    expect(fetchSimulado.mock.calls[0][0]).toContain('/gestao/empresas/7');
    expect(fetchSimulado.mock.calls[0][1].method).toBe('PUT');
    expect(fetchSimulado.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ activa: false }) }));
    expect(fetchSimulado.mock.calls[2][1].method).toBe('DELETE');
  });

  it('aprova um cadastro empresarial pendente', async () => {
    guardarSessao({ token: 'token-administrador' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { id: 9, estadoCadastro: 'APROVADA' } }) });
    vi.stubGlobal('fetch', fetchSimulado);
    await decidirCadastroEmpresaAdministrativa(9, 'APROVADA');
    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/gestao/empresas/9/aprovacao'), expect.objectContaining({ method: 'PATCH' }));
  });

  it('envia um aviso administrativo para os passageiros da viagem', async () => {
    guardarSessao({ token: 'token-administrador' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { totalDestinatarios: 3 } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    const resultado = await enviarAvisoViagemAdministrativa(17, 'A partida terá um atraso de vinte minutos.');

    expect(resultado.totalDestinatarios).toBe(3);
    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/gestao/viagens/17/avisos-whatsapp'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer token-administrador' })
    }));
  });

  it('elimina um usuário pela rota administrativa autenticada', async () => {
    guardarSessao({ token: 'token-administrador' });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: { mensagem: 'Usuário eliminado com sucesso.' } }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await eliminarUtilizadorAdministrativo(23);

    expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('/gestao/utilizadores/23'), expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer token-administrador' })
    }));
  });

  it('restringe a pesquisa do atendente às viagens da sua empresa', async () => {
    guardarSessao({ token: 'token-atendente', utilizador: { perfil: 'GESTOR_SUPORTE', empresaId: 12 } });
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: [] }) });
    vi.stubGlobal('fetch', fetchSimulado);

    await pesquisarViagens({ origem: 'Maputo', destino: 'Beira', data: '2026-11-10' });

    expect(fetchSimulado.mock.calls[0][0]).toContain('empresaId=12');
  });

  it('carrega as províncias e cidades do catálogo público', async () => {
    const fetchSimulado = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dados: [{ provincia: 'Tete', cidades: ['Tete'] }] }) });
    vi.stubGlobal('fetch', fetchSimulado);

    const localidades = await listarLocalidades();

    expect(localidades[0].cidades).toContain('Tete');
    expect(fetchSimulado.mock.calls[0][0]).toContain('/catalogo/localidades');
  });
});
