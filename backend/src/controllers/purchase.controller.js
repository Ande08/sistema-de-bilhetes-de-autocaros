import { Assento, Bilhete, Bus, Empresa, Pagamento, Route, Trip } from '../models/index.js';
import { ServicoCompra } from '../services/compra.service.js';
import { registarAuditoria } from '../services/auditoria.service.js';
import { gerarBilhetePdf } from '../services/bilhete-pdf.service.js';

const servicoCompra = new ServicoCompra();

export async function criarCompra(req, res, next) {
  try {
    const vendaAssistida = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN', 'ADMIN'].includes(req.utilizador.perfil);
    const passageiroId = vendaAssistida && req.body.utilizadorId
      ? req.body.utilizadorId
      : req.utilizador.id;
    const compra = await servicoCompra.comprar({
      utilizadorId: passageiroId,
      operador: req.utilizador,
      operadorId: req.utilizador.id,
      viagemId: req.body.viagemId,
      assentoId: req.body.assentoId,
      metodoPagamento: req.body.metodoPagamento,
      referenciaPagamento: req.body.referenciaPagamento
    });
    if (vendaAssistida) {
      await registarAuditoria({
        utilizadorId: req.utilizador.id,
        operacao: 'VENDA_ASSISTIDA',
        entidade: 'bilhete',
        entidadeId: compra.bilhete.codigo,
        valoresNovos: { passageiroId, viagemId: req.body.viagemId },
        enderecoIp: req.ip
      });
    }
    req.app.get('io')?.to(`assentos:${req.body.viagemId}`).emit('assentos:actualizado', {
      viagemId: Number(req.body.viagemId), assentoId: Number(req.body.assentoId), estado: 'OCUPADO'
    });
    return res.status(201).json({ sucesso: true, dados: compra });
  } catch (erro) { return next(erro); }
}

export async function consultarBilhete(req, res, next) {
  try {
    const bilhete = await obterBilheteAutorizado(req.params.codigo, req.utilizador);
    return res.json({ sucesso: true, dados: bilhete });
  } catch (erro) { return next(erro); }
}

export async function descarregarBilhetePdf(req, res, next) {
  try {
    const bilhete = await obterBilheteAutorizado(req.params.codigo, req.utilizador);
    const pdf = gerarBilhetePdf({
      bilhete,
      empresa: bilhete.Trip.Empresa,
      rota: bilhete.Trip.Route,
      viagem: bilhete.Trip,
      assento: bilhete.Assento,
      pagamento: bilhete.Pagamento
    });
    const codigoSeguro = String(bilhete.codigo).replace(/[^a-zA-Z0-9_-]/g, '-');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bilhete-${codigoSeguro}.pdf"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store'
    });
    return res.send(pdf);
  } catch (erro) { return next(erro); }
}

async function obterBilheteAutorizado(codigo, utilizador) {
  const bilhete = await Bilhete.findOne({
    where: { codigo },
    include: [Pagamento, Assento, { model: Trip, include: [Route, Bus, Empresa] }]
  });
  if (!bilhete) {
    const erro = new Error('Bilhete não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }
  const operadorEmpresa = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(utilizador.perfil);
  const viagemOutraEmpresa = operadorEmpresa && String(bilhete.Trip?.empresaId) !== String(utilizador.empresaId);
  const podeGerir = ['ADMIN', 'GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(utilizador.perfil) && !viagemOutraEmpresa;
  if (!podeGerir && String(bilhete.utilizadorId) !== String(utilizador.id)) {
    const erro = new Error('Não tem permissão para consultar este bilhete.');
    erro.statusCode = 403;
    throw erro;
  }
  return bilhete;
}
