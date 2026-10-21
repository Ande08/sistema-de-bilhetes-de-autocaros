import { Op } from 'sequelize';
import { User } from '../models/index.js';

// Lista apenas clientes activos para evitar vendas em contas administrativas ou bloqueadas.
export async function listarClientes(req, res, next) {
  try {
    const pesquisa = String(req.query.pesquisa || '').trim();
    const where = { perfil: 'PASSAGEIRO', activo: true };
    if (pesquisa) {
      where[Op.or] = [
        { nome: { [Op.like]: `%${pesquisa}%` } },
        { apelido: { [Op.like]: `%${pesquisa}%` } },
        { telefone: { [Op.like]: `%${pesquisa}%` } }
      ];
    }
    const clientes = await User.findAll({
      where,
      attributes: ['id', 'nome', 'apelido', 'telefone'],
      order: [['nome', 'ASC'], ['apelido', 'ASC']],
      limit: 100
    });
    return res.json({ sucesso: true, dados: clientes });
  } catch (erro) { return next(erro); }
}
