import { listarAssentosDaViagem } from '../services/assento.service.js';
import { libertarReservaAssento, reservarAssentoTemporariamente } from '../services/reserva-assento.service.js';

export async function listarAssentos(req, res, next) {
  try {
    const assentos = await listarAssentosDaViagem(req.params.viagemId, req.utilizador.id);
    return res.json({ sucesso: true, dados: assentos });
  } catch (erro) { return next(erro); }
}

export async function reservarAssento(req, res, next) {
  try {
    const reserva = await reservarAssentoTemporariamente({
      viagemId: req.params.viagemId,
      assentoId: req.params.assentoId,
      utilizadorId: req.utilizador.id
    });
    for (const assentoId of reserva.libertados) emitirActualizacao(req, reserva.viagemId, assentoId, 'DISPONIVEL');
    emitirActualizacao(req, reserva.viagemId, reserva.assentoId, 'RESERVADO_TEMPORARIAMENTE', reserva.expiraEm);
    return res.status(201).json({ sucesso: true, dados: reserva });
  } catch (erro) { return next(erro); }
}

export async function libertarAssento(req, res, next) {
  try {
    const resultado = await libertarReservaAssento({
      viagemId: req.params.viagemId,
      assentoId: req.params.assentoId,
      utilizadorId: req.utilizador.id
    });
    if (resultado.libertado) emitirActualizacao(req, resultado.viagemId, resultado.assentoId, 'DISPONIVEL');
    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) { return next(erro); }
}

function emitirActualizacao(req, viagemId, assentoId, estado, expiraEm = null) {
  req.app.get('io')?.to(`assentos:${viagemId}`).emit('assentos:actualizado', { viagemId, assentoId, estado, expiraEm });
}
