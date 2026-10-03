import { ConstrutorBilhete } from '../builders/ticket.builder.js';

export class ServicoBilhete {
  // Fachada responsável por coordenar a construção do bilhete.
  emitir(dados) {
    return new ConstrutorBilhete()
      .passageiro(dados.passageiro)
      .viagem(dados.viagem)
      .assento(dados.assento)
      .pagamento(dados.pagamento)
      .preco(dados.preco)
      .construir();
  }
}
