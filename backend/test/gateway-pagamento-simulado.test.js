import test from 'node:test';
import assert from 'node:assert/strict';
import { gatewayPagamentoSimulado } from '../src/services/gateway-pagamento-simulado.service.js';

test('API falsa percorre os estados pendente e aprovado antes da utilização', async () => {
  const atrasoAnterior = process.env.PAGAMENTO_SIMULADO_ATRASO_MS;
  process.env.PAGAMENTO_SIMULADO_ATRASO_MS = '0';
  try {
    const iniciada = gatewayPagamentoSimulado.iniciar({
      utilizadorId: 501,
      metodo: 'MPESA',
      valor: 850,
      dadosPagamento: { telefone: '+258841234567' }
    });
    assert.equal(iniciada.estado, 'PENDENTE');
    assert.match(iniciada.referencia, /^SIM-MPESA-/);
    assert.throws(
      () => gatewayPagamentoSimulado.reservarAprovado({ referencia: iniciada.referencia, utilizadorId: 501 }),
      /ainda não foi aprovado/
    );

    const aprovada = await gatewayPagamentoSimulado.processar({ referencia: iniciada.referencia, utilizadorId: 501 });
    assert.equal(aprovada.estado, 'APROVADO');
    const pagamento = gatewayPagamentoSimulado.reservarAprovado({ referencia: iniciada.referencia, utilizadorId: 501 });
    assert.equal(pagamento.valor, 850);
    gatewayPagamentoSimulado.concluirUtilizacao(iniciada.referencia);
    assert.throws(
      () => gatewayPagamentoSimulado.reservarAprovado({ referencia: iniciada.referencia, utilizadorId: 501 }),
      /já foi utilizada/
    );
  } finally {
    if (atrasoAnterior === undefined) delete process.env.PAGAMENTO_SIMULADO_ATRASO_MS;
    else process.env.PAGAMENTO_SIMULADO_ATRASO_MS = atrasoAnterior;
  }
});

test('API falsa rejeita dados incompletos do cartão de demonstração', () => {
  assert.throws(() => gatewayPagamentoSimulado.iniciar({
    utilizadorId: 502,
    metodo: 'CARTAO',
    valor: 1200,
    dadosPagamento: { numeroCartao: '1234', validade: '12/30', cvv: '123' }
  }), /dados do cartão de demonstração/);
});
