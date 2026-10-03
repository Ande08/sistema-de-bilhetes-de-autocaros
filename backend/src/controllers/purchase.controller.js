import { Assento, Bilhete, Pagamento, Route, Trip } from '../models/index.js';
import { ServicoCompra } from '../services/compra.service.js';

const servicoCompra = new ServicoCompra();

export async function criarCompra(req, res, next) {
  try {
    const compra = await servicoCompra.comprar({
      utilizadorId: req.utilizador.id,
      viagemId: req.body.viagemId,
      assentoId: req.body.assentoId,
      metodoPagamento: req.body.metodoPagamento
    });
    return res.status(201).json({ sucesso: true, dados: compra });
  } catch (erro) { return next(erro); }
}

export async function consultarBilhete(req, res, next) {
  try {
    const bilhete = await Bilhete.findOne({
      where: { codigo: req.params.codigo },
      include: [Pagamento, Assento, { model: Trip, include: [Route] }]
    });
    if (!bilhete) {
      const erro = new Error('Bilhete não encontrado.');
      erro.statusCode = 404;
      throw erro;
    }
    if (req.utilizador.perfil !== 'ADMIN' && String(bilhete.utilizadorId) !== String(req.utilizador.id)) {
      const erro = new Error('Não tem permissão para consultar este bilhete.');
      erro.statusCode = 403;
      throw erro;
    }
    return res.json({ sucesso: true, dados: bilhete });
  } catch (erro) { return next(erro); }
}
