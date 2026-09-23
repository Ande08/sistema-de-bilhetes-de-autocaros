class PagamentoSimulado {
  constructor(metodo) {
    this.metodo = metodo;
  }

  processar({ valor, referencia }) {
    // O pagamento é simulado nesta fase, mas mantém a interface da integração real.
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
  // Centraliza a criação dos métodos de pagamento suportados.
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
