import { listarAssentosDaViagem } from '../services/assento.service.js';

export async function listarAssentos(req, res, next) {
  try {
    const assentos = await listarAssentosDaViagem(req.params.viagemId);
    return res.json({ sucesso: true, dados: assentos });
  } catch (erro) { return next(erro); }
}
