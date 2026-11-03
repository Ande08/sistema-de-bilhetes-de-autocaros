import { describe, expect, it } from 'vitest';
import { extrairCodigoValidacaoBilhete } from './validacao-bilhete.js';

describe('ligação pública de validação do bilhete', () => {
  it('extrai o código da rota criada pelo QR Code', () => {
    expect(extrairCodigoValidacaoBilhete('/validar-bilhete/BIL-TESTE-001')).toBe('BIL-TESTE-001');
  });

  it('ignora outras páginas ou códigos mal codificados', () => {
    expect(extrairCodigoValidacaoBilhete('/entrar')).toBeNull();
    expect(extrairCodigoValidacaoBilhete('/validar-bilhete/%E0%A4%A')).toBeNull();
  });
});
