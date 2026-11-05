import { describe, expect, it } from 'vitest';
import { avaliarCapacidade3D } from './MapaAssentos.jsx';

describe('disponibilidade do mapa 3D na fase de testes', () => {
  it('mantém o botão da vista 3D disponível sem filtrar ligação ou capacidade do aparelho', () => {
    expect(avaliarCapacidade3D().permitido).toBe(true);
  });

  it('identifica claramente que a liberação global é temporária para testes', () => {
    expect(avaliarCapacidade3D().motivo).toMatch(/testes/i);
  });
});
