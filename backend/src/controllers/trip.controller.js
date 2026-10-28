import { Op } from 'sequelize';
import { Empresa, Route, Trip } from '../models/index.js';

export async function listTrips(req, res, next) {
  try {
  const { origem, destino, origemProvincia, destinoProvincia, empresaId, data } = req.query;
  const filtro = { status: 'AGENDADA', departureAt: { [Op.gt]: new Date() } };
  if (data) {
    const inicio = new Date(`${data}T00:00:00`);
    const fim = new Date(`${data}T23:59:59.999`);
    if (Number.isNaN(inicio.getTime())) {
      const erro = new Error('A data informada é inválida.');
      erro.statusCode = 400;
      throw erro;
    }
    filtro.departureAt = { [Op.between]: [inicio, fim] };
  }

  const filtroRota = {};
  if (origem) filtroRota.origin = { [Op.like]: String(origem).trim() };
  if (destino) filtroRota.destination = { [Op.like]: String(destino).trim() };
  if (origemProvincia) filtroRota.originProvince = String(origemProvincia).trim();
  if (destinoProvincia) filtroRota.destinationProvince = String(destinoProvincia).trim();
  filtroRota.active = true;
  if (empresaId) filtro.empresaId = empresaId;
  const viagens = await Trip.findAll({
    where: filtro,
    include: [
      { model: Route, where: filtroRota, required: true },
      { model: Empresa, where: { activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null }, attributes: ['id', 'nome', 'slug', 'logoUrl'], required: true }
    ],
    order: [['departureAt', 'ASC']]
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
