import { describe, expect, it } from 'vitest';
import { mensagemFoiEnviadaPeloUtilizador } from './ChatTicketSuporte.jsx';

describe('alinhamento das mensagens do suporte', () => {
  it('identifica a mensagem enviada pelo utilizador autenticado', () => {
    expect(mensagemFoiEnviadaPeloUtilizador({ remetenteId: 10, autorTipo: 'PASSAGEIRO' }, 10)).toBe(true);
  });

  it('mantém as mensagens recebidas e automáticas fora do lado do remetente', () => {
    expect(mensagemFoiEnviadaPeloUtilizador({ remetenteId: 20, autorTipo: 'GESTOR_SUPORTE' }, 10)).toBe(false);
    expect(mensagemFoiEnviadaPeloUtilizador({ remetenteId: null, autorTipo: 'SISTEMA' }, null)).toBe(false);
    expect(mensagemFoiEnviadaPeloUtilizador({ remetenteId: null, autorTipo: 'PASSAGEIRO' }, null)).toBe(false);
  });
});
