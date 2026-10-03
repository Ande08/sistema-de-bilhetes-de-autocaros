import { obterResumoConta } from '../services/conta.service.js';

export async function obterResumo(req, res, next) {
  try {
    const resumo = await obterResumoConta(req.utilizador.id);
    return res.json({ sucesso: true, dados: resumo });
  } catch (erro) { return next(erro); }
}
