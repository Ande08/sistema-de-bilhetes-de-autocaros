import { Assento, Bilhete, Bus, Cupao, Empresa, Pagamento, Route, Trip } from '../models/index.js';
import { ServicoCompra } from '../services/compra.service.js';
import { registarAuditoria } from '../services/auditoria.service.js';
import { gerarBilhetePdf } from '../services/bilhete-pdf.service.js';
import { obterValidacaoPublicaBilhete } from '../services/validacao-bilhete.service.js';

const servicoCompra = new ServicoCompra();

export async function criarCompra(req, res, next) {
  try {
    if (req.utilizador.perfil === 'ADMIN') {
      const erro = new Error('O administrador da plataforma não pode vender bilhetes.');
      erro.statusCode = 403;
      throw erro;
    }
    const vendaAssistida = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(req.utilizador.perfil);
    const passageiroId = vendaAssistida && req.body.utilizadorId
      ? req.body.utilizadorId
      : req.utilizador.id;
    const compra = await servicoCompra.comprar({
      utilizadorId: passageiroId,
      operador: req.utilizador,
      operadorId: req.utilizador.id,
      viagemId: req.body.viagemId,
      assentoId: req.body.assentoId,
      assentoIds: req.body.assentoIds,
      quantidade: req.body.quantidade,
      atribuicaoAutomatica: req.body.atribuicaoAutomatica,
      metodoPagamento: req.body.metodoPagamento,
      referenciaPagamento: req.body.referenciaPagamento,
      codigoCupao: req.body.codigoCupao
    });
    if (vendaAssistida) {
      await registarAuditoria({
        utilizadorId: req.utilizador.id,
        operacao: 'VENDA_ASSISTIDA',
        entidade: 'bilhete',
        entidadeId: compra.bilhete.codigo,
        valoresNovos: { passageiroId, viagemId: req.body.viagemId, quantidade: compra.quantidade, bilhetes: compra.bilhetes.map((item) => item.codigo) },
        enderecoIp: req.ip
      });
    }
    compra.bilhetes.forEach((bilhete) => req.app.get('io')?.to(`assentos:${req.body.viagemId}`).emit('assentos:actualizado', {
      viagemId: Number(req.body.viagemId), assentoId: Number(bilhete.assentoId), estado: 'OCUPADO'
    }));
    return res.status(201).json({ sucesso: true, dados: compra });
  } catch (erro) { return next(erro); }
}

export async function consultarBilhete(req, res, next) {
  try {
    const bilhete = await obterBilheteAutorizado(req.params.codigo, req.utilizador);
    return res.json({ sucesso: true, dados: bilhete });
  } catch (erro) { return next(erro); }
}

export async function validarBilhetePublico(req, res, next) {
  try {
    // O estado pode mudar para utilizado ou cancelado a qualquer momento; a
    // resposta pública deve ser sempre consultada novamente e nunca guardada.
    res.set('Cache-Control', 'no-store');
    const resultado = await obterValidacaoPublicaBilhete(req.params.codigo);
    if (!resultado) {
      return res.status(404).json({ sucesso: false, mensagem: 'Bilhete não encontrado ou código inválido.', dados: { autentico: false, validoParaEmbarque: false } });
    }
    return res.json({ sucesso: true, dados: resultado });
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
      pagamento: bilhete.Pagamento,
      cupao: bilhete.Cupao
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
    include: [Pagamento, Assento, Cupao, { model: Trip, include: [Route, Bus, Empresa] }]
  });
  if (!bilhete) {
    const erro = new Error('Bilhete não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }
  const operadorEmpresa = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(utilizador.perfil);
  const viagemOutraEmpresa = operadorEmpresa && String(bilhete.Trip?.empresaId) !== String(utilizador.empresaId);
  const podeGerir = ['GESTOR_SUPORTE', 'EMPRESA_ADMIN'].includes(utilizador.perfil) && !viagemOutraEmpresa;
  if (!podeGerir && String(bilhete.utilizadorId) !== String(utilizador.id)) {
    const erro = new Error('Não tem permissão para consultar este bilhete.');
    erro.statusCode = 403;
    throw erro;
  }
  return bilhete;
}
