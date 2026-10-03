export class ConstrutorBilhete {
  constructor() {
    this.bilhete = {
      estado: 'RESERVADO',
      criadoEm: new Date().toISOString()
    };
  }

  passageiro({ nome }) {
    this.bilhete.passageiro = { nome };
    return this;
  }

  viagem({ id, origem, destino, partidaEm }) {
    this.bilhete.viagem = { id, origem, destino, partidaEm };
    return this;
  }

  assento({ id, numero }) {
    this.bilhete.assento = { id, numero };
    return this;
  }

  pagamento({ metodo, referencia, valor, estado }) {
    this.bilhete.pagamento = { metodo, referencia, valor, estado };
    return this;
  }

  preco(valor) {
    this.bilhete.preco = Number(valor);
    return this;
  }

  construir() {
    // Impede a emissão de um bilhete sem os dados essenciais.
    const required = ['passageiro', 'viagem', 'assento', 'pagamento', 'preco'];
    const ausentes = required.filter((campo) => !this.bilhete[campo]);
    if (ausentes.length > 0) {
      throw new Error(`Dados obrigatórios do bilhete ausentes: ${ausentes.join(', ')}`);
    }

    return {
      ...this.bilhete,
      codigo: `BIL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      estado: 'EMITIDO'
    };
  }
}
