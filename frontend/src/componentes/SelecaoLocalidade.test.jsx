import { describe, expect, it } from 'vitest';
import { construirOpcoesLocalidade, localizarOpcaoLocalidade } from './SelecaoLocalidade.jsx';

const localidades = [
  { provincia: 'Maputo Cidade', cidades: ['Maputo'] },
  { provincia: 'Sofala', cidades: ['Beira', 'Dondo'] }
];

describe('pesquisa de localidades do cliente', () => {
  it('cria opções pesquisáveis com cidade e província', () => {
    expect(construirOpcoesLocalidade(localidades)).toEqual([
      { provincia: 'Maputo Cidade', cidade: 'Maputo', texto: 'Maputo — Maputo Cidade' },
      { provincia: 'Sofala', cidade: 'Beira', texto: 'Beira — Sofala' },
      { provincia: 'Sofala', cidade: 'Dondo', texto: 'Dondo — Sofala' }
    ]);
  });

  it('aceita somente uma opção completa do catálogo', () => {
    const opcoes = construirOpcoesLocalidade(localidades);
    expect(localizarOpcaoLocalidade(opcoes, 'beira — sofala')).toEqual({ provincia: 'Sofala', cidade: 'Beira', texto: 'Beira — Sofala' });
    expect(localizarOpcaoLocalidade(opcoes, 'Beira')).toBeNull();
    expect(localizarOpcaoLocalidade(opcoes, 'Cidade inventada — Sofala')).toBeNull();
  });
});
