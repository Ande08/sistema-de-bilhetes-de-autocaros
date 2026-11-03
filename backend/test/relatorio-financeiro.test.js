import test from 'node:test';
import assert from 'node:assert/strict';
import { construirResumoFinanceiro, gerarRelatorioFinanceiroPdf } from '../src/services/relatorio-financeiro.service.js';

function pagamento({ valor, desconto, metodo, rota, referencia, partida = '2026-11-03T08:00:00+02:00', criadoEm = '2026-11-03T10:00:00Z' }) {
  const [origin, destination] = rota.split(' -> ');
  return {
    valor,
    metodo,
    referencia,
    estado: 'APROVADO',
    criado_em: criadoEm,
    Bilhete: {
      codigo: `BIL-${referencia}`,
      desconto,
      Trip: { departureAt: partida, Route: { origin, destination } }
    }
  };
}

test('calcula o relatório financeiro usando somente pagamentos aprovados recebidos', () => {
  const resumo = construirResumoFinanceiro({
    empresa: { id: 7, nome: 'Transportes Teste' },
    periodo: { inicio: new Date('2026-11-01T00:00:00+02:00'), fim: new Date('2026-11-30T23:59:59+02:00') },
    pagamentos: [
      pagamento({ valor: 1200, desconto: 100, metodo: 'MPESA', rota: 'Maputo -> Beira', referencia: '1' }),
      pagamento({ valor: 1500, desconto: 0, metodo: 'CARTAO', rota: 'Maputo -> Beira', referencia: '2' }),
      pagamento({ valor: 900, desconto: 50, metodo: 'MPESA', rota: 'Maputo -> Xai-Xai', referencia: '3', partida: '2026-11-04T15:00:00+02:00', criadoEm: '2026-11-04T10:00:00Z' })
    ],
    pagamentosAnteriores: [
      pagamento({ valor: 2400, desconto: 0, metodo: 'MPESA', rota: 'Maputo -> Beira', referencia: 'ANT-1', partida: '2026-10-03T08:00:00+02:00', criadoEm: '2026-10-03T10:00:00Z' })
    ]
  });
  assert.equal(resumo.indicadores.pagamentosAprovados, 3);
  assert.equal(resumo.indicadores.volumeAprovado, 3600);
  assert.equal(resumo.indicadores.valorMedio, 1200);
  assert.equal(resumo.indicadores.descontos, 150);
  assert.equal(resumo.indicadores.valorBruto, 3750);
  assert.equal(resumo.indicadores.taxaDesconto, 4);
  assert.equal(resumo.indicadores.crescimentoVolume, 50);
  assert.equal(resumo.indicadores.crescimentoPagamentos, 200);
  assert.equal(resumo.indicadores.diasComVendas, 2);
  assert.equal(resumo.indicadores.concentracaoMelhorRota, 75);
  assert.deepEqual(resumo.rotas[0], { rota: 'Maputo -> Beira', bilhetes: 2, volume: 2700 });
  assert.deepEqual(resumo.metodos[0], { metodo: 'MPESA', transacoes: 2, volume: 2100 });
  assert.deepEqual(resumo.diasSemana[0], { dia: 'Terça-feira', bilhetes: 2, volume: 2700 });
  assert.deepEqual(resumo.faixasHorarias[0], { faixa: 'Manhã (06h-11h)', bilhetes: 2, volume: 2700 });
});

test('gera PDF A4 pronto para impressão com identidade da empresa', async () => {
  const dados = construirResumoFinanceiro({
    empresa: { id: 7, nome: 'Transportes Teste', logoUrl: null },
    periodo: { inicio: new Date('2026-11-01T00:00:00+02:00'), fim: new Date('2026-11-30T23:59:59+02:00') },
    pagamentos: [pagamento({ valor: 1200, desconto: 100, metodo: 'MPESA', rota: 'Maputo -> Beira', referencia: '1' })]
  });
  const pdf = await gerarRelatorioFinanceiroPdf(dados);
  assert.match(pdf.subarray(0, 8).toString('ascii'), /^%PDF-1\.[0-9]$/);
  assert.match(pdf.toString('latin1'), /Transportes Teste/);
  assert.match(pdf.toString('latin1'), /MediaBox \[0 0 595\.28 841\.89\]/);
  assert.ok(pdf.length > 3000);
});
