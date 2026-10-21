import { actualizarConfiguracaoIa, listarModelosIa, obterConfiguracaoIaPublica, testarConfiguracaoIa } from '../services/configuracao-ia.service.js';

export async function obterConfiguracao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterConfiguracaoIaPublica() }); }
  catch (erro) { return next(erro); }
}
export async function guardarConfiguracao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await actualizarConfiguracaoIa(req.body, req.utilizador.id) }); }
  catch (erro) { return next(erro); }
}
export async function obterModelos(req, res, next) {
  try { return res.json({ sucesso: true, dados: await listarModelosIa() }); }
  catch (erro) { return next(erro); }
}
export async function testarLigacao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await testarConfiguracaoIa() }); }
  catch (erro) { return next(erro); }
}
