import { FabricaPagamento } from '../factories/payment.factory.js';

export class ServicoPagamento {
  processar({ metodo, valor, referencia = `PAG-${Date.now()}` }) {
    const pagamento = FabricaPagamento.criar(metodo);
    return pagamento.processar({ valor, referencia });
  }
}
