import { Trip } from '../models/index.js';
import { gatewayPagamentoSimulado } from '../services/gateway-pagamento-simulado.service.js';

export async function iniciarPagamentoSimulado(req, res, next) {
  try {
    const viagem = await Trip.findByPk(req.body.viagemId);
    if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
      const erro = new Error('Esta viagem não está disponível para pagamento.');
      erro.statusCode = 409;
      throw erro;
    }
    const transacao = gatewayPagamentoSimulado.iniciar({
      utilizadorId: req.utilizador.id,
      metodo: req.body.metodo,
      valor: viagem.price,
      dadosPagamento: req.body.dadosPagamento
    });
    return res.status(201).json({ sucesso: true, dados: transacao });
  } catch (erro) { return next(erro); }
}

export async function processarPagamentoSimulado(req, res, next) {
  try {
    const transacao = await gatewayPagamentoSimulado.processar({
      referencia: req.params.referencia,
      utilizadorId: req.utilizador.id
    });
    return res.json({ sucesso: true, dados: transacao });
  } catch (erro) { return next(erro); }
}
