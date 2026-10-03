import { FabricaPagamento } from '../factories/payment.factory.js';
import { randomUUID } from 'node:crypto';

export class ServicoPagamento {
  // Mantém a lógica de pagamento fora dos controllers.
  processar({ metodo, valor, referencia = `PAG-${randomUUID()}` }) {
    const pagamento = FabricaPagamento.criar(metodo);
    return pagamento.processar({ valor, referencia });
  }
}
