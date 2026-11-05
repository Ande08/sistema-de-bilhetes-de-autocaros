import { Trip } from '../models/index.js';
import { gatewayPagamentoSimulado } from '../services/gateway-pagamento-simulado.service.js';
import { calcularPrecoComCupao } from '../services/cupao.service.js';

export async function iniciarPagamentoSimulado(req, res, next) {
  try {
    const viagem = await Trip.findByPk(req.body.viagemId);
    if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
      const erro = new Error('Esta viagem não está disponível para pagamento.');
      erro.statusCode = 409;
      throw erro;
    }
    const vendaAssistida = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(req.utilizador.perfil);
    if (vendaAssistida && String(req.utilizador.empresaId) !== String(viagem.empresaId)) {
      const erro = new Error('Só pode vender viagens e aplicar cupões da própria empresa.');
      erro.statusCode = 403;
      throw erro;
    }
    const passageiroId = vendaAssistida && req.body.utilizadorId ? req.body.utilizadorId : req.utilizador.id;
    const resumo = await calcularPrecoComCupao({
      codigo: req.body.codigoCupao,
      viagem,
      utilizadorId: passageiroId,
      quantidade: req.body.quantidade
    });
    const transacao = gatewayPagamentoSimulado.iniciar({
      utilizadorId: req.utilizador.id,
      metodo: req.body.metodo,
      valor: resumo.valorFinal,
      dadosPagamento: req.body.dadosPagamento,
      cupaoCodigo: resumo.codigo,
      precoOriginal: resumo.precoOriginal,
      desconto: resumo.desconto
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
