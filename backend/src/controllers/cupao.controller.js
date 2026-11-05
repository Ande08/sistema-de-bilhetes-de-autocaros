import { Trip } from '../models/index.js';
import { actualizarCupaoEmpresa, calcularPrecoComCupao, criarCupaoEmpresa, definirEstadoCupaoEmpresa, listarCupoesEmpresa } from '../services/cupao.service.js';

export async function listarCupoes(req, res, next) {
  try { return res.json({ sucesso: true, dados: await listarCupoesEmpresa(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function criarCupao(req, res, next) {
  try { return res.status(201).json({ sucesso: true, dados: await criarCupaoEmpresa(req.body, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function actualizarCupao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await actualizarCupaoEmpresa(req.params.id, req.body, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function definirEstadoCupao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await definirEstadoCupaoEmpresa(req.params.id, req.body.activo, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function validarCupaoCompra(req, res, next) {
  try {
    const viagem = await Trip.findByPk(req.body.viagemId);
    if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
      const erro = new Error('Esta viagem não está disponível.'); erro.statusCode = 409; throw erro;
    }
    const operador = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(req.utilizador.perfil);
    if (operador && String(req.utilizador.empresaId) !== String(viagem.empresaId)) {
      const erro = new Error('Só pode validar cupões da própria empresa.'); erro.statusCode = 403; throw erro;
    }
    const utilizadorId = operador && req.body.utilizadorId ? req.body.utilizadorId : req.utilizador.id;
    const resumo = await calcularPrecoComCupao({ codigo: req.body.codigo, viagem, utilizadorId, quantidade: req.body.quantidade });
    return res.json({ sucesso: true, dados: serializarResumo(resumo) });
  } catch (erro) { return next(erro); }
}

export function serializarResumo(resumo) {
  return {
    codigo: resumo.codigo || null,
    percentagem: resumo.percentagem || 0,
    precoOriginal: resumo.precoOriginal,
    desconto: resumo.desconto,
    valorFinal: resumo.valorFinal
  };
}
