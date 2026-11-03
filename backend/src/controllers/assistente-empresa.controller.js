import { obterAnaliseEmpresa, perguntarAssistenteEmpresa } from '../services/assistente-empresa.service.js';

export async function obterAnalise(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterAnaliseEmpresa(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function perguntar(req, res, next) {
  try { return res.json({ sucesso: true, dados: await perguntarAssistenteEmpresa(req.utilizador, req.body.pergunta) }); }
  catch (erro) { return next(erro); }
}
