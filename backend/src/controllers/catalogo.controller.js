import { Empresa } from '../models/index.js';
import { LOCALIDADES_MOCAMBIQUE } from '../services/localidades.service.js';

export function listarLocalidades(_req, res) {
  return res.json({ sucesso: true, dados: LOCALIDADES_MOCAMBIQUE });
}

export async function listarEmpresas(_req, res, next) {
  try {
    const empresas = await Empresa.findAll({
      where: { activa: true },
      attributes: ['id', 'nome', 'slug', 'logoUrl', 'descricao', 'website'],
      order: [['nome', 'ASC']]
    });
    return res.json({ sucesso: true, dados: empresas });
  } catch (erro) { return next(erro); }
}
