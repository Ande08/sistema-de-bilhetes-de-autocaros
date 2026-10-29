import { Op } from 'sequelize';
import { Empresa, Route, Trip } from '../models/index.js';
import { obterIntervaloPesquisaViagens } from '../services/pesquisa-viagem.service.js';

export async function listTrips(req, res, next) {
  try {
  const { origem, destino, origemProvincia, destinoProvincia, empresaId, data, limite } = req.query;
  const intervalo = obterIntervaloPesquisaViagens(data);
  const filtroPartida = intervalo.fim
    ? { [Op.between]: [intervalo.inicio, intervalo.fim] }
    : { [Op.gt]: intervalo.inicio };
  const filtro = { status: 'AGENDADA', departureAt: filtroPartida };

  const filtroRota = {};
  if (origem) filtroRota.origin = { [Op.like]: String(origem).trim() };
  if (destino) filtroRota.destination = { [Op.like]: String(destino).trim() };
  if (origemProvincia) filtroRota.originProvince = String(origemProvincia).trim();
  if (destinoProvincia) filtroRota.destinationProvince = String(destinoProvincia).trim();
  filtroRota.active = true;
  if (empresaId) filtro.empresaId = empresaId;
  const quantidadeMaxima = limite ? Math.min(Math.max(Number.parseInt(limite, 10) || 1, 1), 50) : undefined;
  const viagens = await Trip.findAll({
    where: filtro,
    include: [
      { model: Route, where: filtroRota, required: true },
      { model: Empresa, where: { activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null }, attributes: ['id', 'nome', 'slug', 'logoUrl'], required: true }
    ],
    order: [['departureAt', 'ASC']],
    ...(quantidadeMaxima && { limit: quantidadeMaxima })
  });
  return res.json({ sucesso: true, dados: viagens });
  } catch (erro) { return next(erro); }
}

export async function getTrip(req, res, next) {
  try {
  const viagem = await Trip.findByPk(req.params.id, {
    include: [Route, { model: Empresa, where: { activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null }, attributes: ['id', 'nome', 'slug', 'logoUrl'], required: true }]
  });
  if (!viagem) {
    const error = new Error('Viagem não encontrada');
    error.statusCode = 404;
    return next(error);
  }
  return res.json({ sucesso: true, dados: viagem });
  } catch (erro) { return next(erro); }
}
