class PagamentoSimulado {
  constructor(metodo) {
    this.metodo = metodo;
  }

  processar({ valor, referencia }) {
    return {
      referencia,
      metodo: this.metodo,
      valor,
      estado: 'APROVADO',
      processadoEm: new Date().toISOString(),
      simulado: true
    };
  }
}

export class FabricaPagamento {
  static criar(metodo) {
    const metodoNormalizado = String(metodo || '').toUpperCase();
    const metodosSuportados = ['MPESA', 'EMOLA', 'CARTAO'];

    if (!metodosSuportados.includes(metodoNormalizado)) {
      const error = new Error(`Método de pagamento inválido: ${metodo}`);
      error.statusCode = 400;
      throw error;
    }

    return new PagamentoSimulado(metodoNormalizado);
  }
}
