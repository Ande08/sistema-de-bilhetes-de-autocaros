import { describe, expect, it } from 'vitest';
import { formatarValor } from './moeda.js';

describe('formatação monetária', () => {
  it('apresenta os valores usando a sigla MT', () => {
    const valor = formatarValor(1500);
    expect(valor).toMatch(/1[\s\u00a0]?500,00 MT/);
    expect(valor).not.toContain('MTn');
    expect(valor).not.toContain('MZN');
  });
});
