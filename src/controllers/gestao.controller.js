import { Bus, Route, Trip } from '../models/index.js';

export async function criarAutocarro(req, res, next) {
  try {
    const { matricula, modelo, capacidade } = req.body;
    if (!matricula || !modelo || !Number.isInteger(capacidade) || capacidade <= 0) {
      const erro = new Error('Matrícula, modelo e capacidade válida são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }
    const autocarro = await Bus.create({ registration: matricula, model: modelo, capacity: capacidade });
    return res.status(201).json({ sucesso: true, dados: autocarro });
  } catch (erro) { return next(erro); }
}

export async function criarRota(req, res, next) {
  try {
    const { origem, destino, distanciaKm } = req.body;
    if (!origem || !destino || origem.trim().toLowerCase() === destino.trim().toLowerCase()) {
      const erro = new Error('Origem e destino são obrigatórios e devem ser diferentes.');
      erro.statusCode = 400;
      throw erro;
    }
    const rota = await Route.create({ origin: origem, destination: destino, distanceKm: distanciaKm });
    return res.status(201).json({ sucesso: true, dados: rota });
  } catch (erro) { return next(erro); }
}

export async function criarViagem(req, res, next) {
  try {
    const { rotaId, autocarroId, partidaEm, chegadaPrevistaEm, preco } = req.body;
    if (!rotaId || !autocarroId || !partidaEm || !Number(preco) || Number(preco) <= 0) {
      const erro = new Error('Rota, autocarro, partida e preço válido são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }
    if (new Date(partidaEm) <= new Date()) {
      const erro = new Error('A partida deve estar no futuro.');
      erro.statusCode = 400;
      throw erro;
    }
    const autocarro = await Bus.findByPk(autocarroId);
    const rota = await Route.findByPk(rotaId);
    if (!autocarro || !rota) {
      const erro = new Error('A rota ou o autocarro não foram encontrados.');
      erro.statusCode = 404;
      throw erro;
    }
    const viagem = await Trip.create({ routeId: rotaId, busId: autocarroId, departureAt: partidaEm, arrivalExpectedAt: chegadaPrevistaEm, price: preco });
    return res.status(201).json({ sucesso: true, dados: viagem });
  } catch (erro) { return next(erro); }
}
