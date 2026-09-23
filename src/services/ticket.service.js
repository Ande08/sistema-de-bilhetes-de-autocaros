import { TicketBuilder } from '../builders/ticket.builder.js';

export class ServicoBilhete {
  // Fachada responsável por coordenar a construção do bilhete.
  emitir(dados) {
    return new TicketBuilder()
      .passenger(dados.passageiro)
      .trip(dados.viagem)
      .seat(dados.assento)
      .payment(dados.pagamento)
      .price(dados.preco)
      .build();
  }
}
