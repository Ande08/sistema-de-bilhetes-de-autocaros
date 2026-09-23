import { Op } from 'sequelize';
import { Trip } from '../models/index.js';

export async function listTrips(req, res, next) {
  try {
  const { origin, destination, date } = req.query;
  const filtro = {};
  if (date) filtro.departureAt = { [Op.gte]: `${date} 00:00:00` };

  const viagens = await Trip.findAll({ where: filtro, order: [['departureAt', 'ASC']] });
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
