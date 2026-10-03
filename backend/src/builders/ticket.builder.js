export class TicketBuilder {
  constructor() {
    this.ticket = {
      estado: 'RESERVADO',
      criadoEm: new Date().toISOString()
    };
  }

  passenger({ nome }) {
    this.ticket.passageiro = { nome };
    return this;
  }

  trip({ id, origem, destino, partidaEm }) {
    this.ticket.viagem = { id, origem, destino, partidaEm };
    return this;
  }

  seat({ id, numero }) {
    this.ticket.assento = { id, numero };
    return this;
  }

  payment({ metodo, referencia, valor, estado }) {
    this.ticket.pagamento = { metodo, referencia, valor, estado };
    return this;
  }

  price(value) {
    this.ticket.preco = Number(value);
    return this;
  }

  build() {
    // Impede a emissão de um bilhete sem os dados essenciais.
    const required = ['passageiro', 'viagem', 'assento', 'pagamento', 'preco'];
    const missing = required.filter((field) => !this.ticket[field]);
    if (missing.length > 0) {
      throw new Error(`Dados obrigatórios do bilhete ausentes: ${missing.join(', ')}`);
    }

    return {
      ...this.ticket,
      code: `BIL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      estado: 'EMITIDO'
    };
  }
}
