import { Op } from 'sequelize';
import { Route, Trip } from '../models/index.js';

export async function listTrips(req, res, next) {
  try {
  const { origem, destino, data } = req.query;
  const filtro = { status: 'AGENDADA' };
  if (data) {
    const inicio = new Date(`${data}T00:00:00`);
    const fim = new Date(`${data}T23:59:59.999`);
    filtro.departureAt = { [Op.between]: [inicio, fim] };
  }

  const filtroRota = {};
  if (origem) filtroRota.origin = origem;
  if (destino) filtroRota.destination = destino;
  const viagens = await Trip.findAll({
    where: filtro,
    include: [{ model: Route, where: filtroRota, required: Boolean(origem || destino) }],
    order: [['departureAt', 'ASC']]
  });
  return res.json({ sucesso: true, dados: viagens });
  } catch (erro) { return next(erro); }
}

export async function getTrip(req, res, next) {
  try {
  const viagem = await Trip.findByPk(req.params.id);
  if (!viagem) {
    const error = new Error('Viagem não encontrada');
    error.statusCode = 404;
    return next(error);
  }
  return res.json({ sucesso: true, dados: viagem });
  } catch (erro) { return next(erro); }
}
