import { describe, expect, it } from 'vitest';
import { avaliarCapacidade3D } from './MapaAssentos.jsx';

const documentoComWebgl = {
  createElement: () => ({ getContext: () => ({}) })
};

describe('escolha automática do mapa de assentos', () => {
  it('permite a vista 3D num dispositivo com recursos suficientes', () => {
    expect(avaliarCapacidade3D({ deviceMemory: 8, hardwareConcurrency: 8, connection: { effectiveType: '4g', downlink: 10 } }, documentoComWebgl).permitido).toBe(true);
  });

  it('usa o mapa simples numa ligação lenta', () => {
    expect(avaliarCapacidade3D({ deviceMemory: 8, hardwareConcurrency: 8, connection: { effectiveType: '2g' } }, documentoComWebgl).permitido).toBe(false);
  });

  it('usa o mapa simples num aparelho com pouca memória', () => {
    expect(avaliarCapacidade3D({ deviceMemory: 2, hardwareConcurrency: 8, connection: { effectiveType: '4g' } }, documentoComWebgl).permitido).toBe(false);
  });

  it('usa o mapa simples quando WebGL não está disponível', () => {
    const semWebgl = { createElement: () => ({ getContext: () => null }) };
    expect(avaliarCapacidade3D({ deviceMemory: 8, hardwareConcurrency: 8 }, semWebgl).permitido).toBe(false);
  });
});
