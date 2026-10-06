import { randomUUID } from 'node:crypto';
import { ServicoPagamento } from './payment.service.js';

const METODOS_SUPORTADOS = ['MPESA', 'EMOLA', 'CARTAO'];

class GatewayPagamentoSimulado {
  constructor() {
    this.transacoes = new Map();
    this.servicoPagamento = new ServicoPagamento();
  }

  iniciar({ utilizadorId, metodo, valor, dadosPagamento = {} }) {
    const metodoNormalizado = String(metodo || '').toUpperCase();
    if (!METODOS_SUPORTADOS.includes(metodoNormalizado)) {
      const erro = new Error('Selecione um método de pagamento válido.');
      erro.statusCode = 400;
      throw erro;
    }
    if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
      const erro = new Error('O valor do pagamento é inválido.');
      erro.statusCode = 400;
      throw erro;
    }

    const descricaoConta = this._validarDados(metodoNormalizado, dadosPagamento);
    const referencia = `SIM-${metodoNormalizado}-${randomUUID()}`;
    const transacao = {
      referencia,
      utilizadorId: String(utilizadorId),
      metodo: metodoNormalizado,
      valor: Number(valor),
      descricaoConta,
      estado: 'PENDENTE',
      criadoEm: new Date(),
      resultado: null,
      emUtilizacao: false,
      utilizado: false
    };
    this.transacoes.set(referencia, transacao);
    this._removerExpiradas();
    return this._serializar(transacao);
  }

  async processar({ referencia, utilizadorId }) {
    const transacao = this._obterDoUtilizador(referencia, utilizadorId);
    if (transacao.estado === 'APROVADO') return this._serializar(transacao);

    const atrasoConfigurado = Number(process.env.PAGAMENTO_SIMULADO_ATRASO_MS);
    const atraso = Number.isFinite(atrasoConfigurado) && atrasoConfigurado >= 0
      ? Math.min(atrasoConfigurado, 5000)
      : 1200;
    await new Promise((resolver) => setTimeout(resolver, atraso));

    transacao.resultado = this.servicoPagamento.processar({
      metodo: transacao.metodo,
      valor: transacao.valor,
      referencia: transacao.referencia
    });
    transacao.estado = transacao.resultado.estado;
    transacao.processadoEm = new Date();
    return this._serializar(transacao);
  }

  reservarAprovado({ referencia, utilizadorId }) {
    const transacao = this._obterDoUtilizador(referencia, utilizadorId);
    if (transacao.estado !== 'APROVADO') {
      const erro = new Error('O pagamento simulado ainda não foi aprovado.');
      erro.statusCode = 409;
      throw erro;
    }
    if (transacao.utilizado || transacao.emUtilizacao) {
      const erro = new Error('Esta referência de pagamento já foi utilizada.');
      erro.statusCode = 409;
      throw erro;
    }
    transacao.emUtilizacao = true;
    return { ...transacao.resultado };
  }

  concluirUtilizacao(referencia) {
    const transacao = this.transacoes.get(referencia);
    if (!transacao) return;
    transacao.emUtilizacao = false;
    transacao.utilizado = true;
  }

  libertarReserva(referencia) {
    const transacao = this.transacoes.get(referencia);
    if (transacao && !transacao.utilizado) transacao.emUtilizacao = false;
  }

  _obterDoUtilizador(referencia, utilizadorId) {
    const transacao = this.transacoes.get(String(referencia || ''));
    if (!transacao || transacao.utilizadorId !== String(utilizadorId)) {
      const erro = new Error('Referência de pagamento simulado inválida ou expirada.');
      erro.statusCode = 404;
      throw erro;
    }
    return transacao;
  }

  _validarDados(metodo, dados) {
    if (metodo === 'MPESA' || metodo === 'EMOLA') {
      const telefone = String(dados.telefone || '').replace(/\D/g, '');
      if (telefone.length < 9 || telefone.length > 15) {
        const erro = new Error('Introduza um número de telefone válido para o pagamento simulado.');
        erro.statusCode = 400;
        throw erro;
      }
      return `Telefone terminado em ${telefone.slice(-4)}`;
    }

    const numeroCartao = String(dados.numeroCartao || '').replace(/\D/g, '');
    const validade = String(dados.validade || '');
    const cvv = String(dados.cvv || '').replace(/\D/g, '');
    if (numeroCartao.length !== 16 || !/^\d{2}\/\d{2}$/.test(validade) || !/^\d{3,4}$/.test(cvv)) {
      const erro = new Error('Preencha corretamente os dados do cartão de demonstração.');
      erro.statusCode = 400;
      throw erro;
    }
    return `Cartão de demonstração terminado em ${numeroCartao.slice(-4)}`;
  }

  _serializar(transacao) {
    return {
      referencia: transacao.referencia,
      metodo: transacao.metodo,
      valor: transacao.valor,
      estado: transacao.estado,
      descricaoConta: transacao.descricaoConta,
      criadoEm: transacao.criadoEm,
      processadoEm: transacao.processadoEm || null
    };
  }

  _removerExpiradas() {
    const limite = Date.now() - 30 * 60 * 1000;
    for (const [referencia, transacao] of this.transacoes) {
      if (transacao.criadoEm.getTime() < limite && !transacao.emUtilizacao) this.transacoes.delete(referencia);
    }
  }
}

// Uma única instância mantém as transações falsas durante a demonstração.
export const gatewayPagamentoSimulado = new GatewayPagamentoSimulado();
