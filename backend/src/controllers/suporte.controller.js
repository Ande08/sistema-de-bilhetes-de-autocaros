import { adicionarMensagem, atribuirTicket, actualizarEstadoTicket, criarTicket, listarGestoresSuporte, listarTickets, obterTicketPorId, pesquisarBilhetesParaSuporte } from '../services/suporte.service.js';
import { registarAuditoria } from '../services/auditoria.service.js';
import { guardarImagemSuporte, removerImagemSuporte } from '../services/anexo-suporte.service.js';
import { responderAssistenteComIa } from '../services/assistente-ia.service.js';

export async function consultarAssistente(req, res, next) {
  try {
    if (!req.body.mensagem?.trim() || req.body.mensagem.trim().length > 2000) { const erro = new Error('Escreva uma pergunta com até 2000 caracteres para o assistente.'); erro.statusCode = 400; throw erro; }
    return res.json({ sucesso: true, dados: await responderAssistenteComIa(req.body.mensagem.trim(), req.utilizador.id) });
  } catch (erro) { return next(erro); }
}

export async function abrirTicket(req, res, next) {
  let anexo;
  try {
    anexo = await guardarImagemSuporte(req.body.imagem);
    const ticket = await criarTicket(req.utilizador, req.body, anexo || {});
    await registarAuditoria({ utilizadorId: req.utilizador.id, operacao: 'ABRIR_TICKET', entidade: 'tickets_suporte', entidadeId: ticket.id, valoresNovos: { codigo: ticket.codigo }, enderecoIp: req.ip });
    req.app.get('io')?.to(`empresa:${ticket.empresaId}`).emit('suporte:novo-ticket', ticket);
    return res.status(201).json({ sucesso: true, dados: ticket });
  } catch (erro) { await removerImagemSuporte(anexo?.caminho); return next(erro); }
}

export async function pesquisarBilhetes(req, res, next) {
  try { return res.json({ sucesso: true, dados: await pesquisarBilhetesParaSuporte(req.utilizador, req.query.codigo) }); }
  catch (erro) { return next(erro); }
}

export async function obterTickets(req, res, next) {
  try { return res.json({ sucesso: true, dados: await listarTickets(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function obterTicket(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterTicketPorId(req.params.id, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function enviarMensagem(req, res, next) {
  let anexo;
  try {
    anexo = await guardarImagemSuporte(req.body.imagem);
    const mensagem = await adicionarMensagem(req.params.id, req.utilizador, req.body.mensagem, anexo || {});
    req.app.get('io')?.to(`suporte:${req.params.id}`).emit('suporte:mensagem', mensagem);
    return res.status(201).json({ sucesso: true, dados: mensagem });
  } catch (erro) { await removerImagemSuporte(anexo?.caminho); return next(erro); }
}

export async function atribuir(req, res, next) {
  try {
    const ticket = await atribuirTicket(req.params.id, req.body.gestorId, req.utilizador);
    await registarAuditoria({ utilizadorId: req.utilizador.id, operacao: 'ATRIBUIR_TICKET', entidade: 'tickets_suporte', entidadeId: ticket.id, valoresNovos: { gestorId: req.body.gestorId }, enderecoIp: req.ip });
    req.app.get('io')?.to(`suporte:${req.params.id}`).emit('suporte:ticket-actualizado', ticket);
    req.app.get('io')?.to(`utilizador:${req.body.gestorId}`).emit('suporte:atribuido', ticket);
    return res.json({ sucesso: true, dados: ticket });
  } catch (erro) { return next(erro); }
}

export async function mudarEstado(req, res, next) {
  try {
    const ticket = await actualizarEstadoTicket(req.params.id, req.body.estado, req.utilizador);
    await registarAuditoria({ utilizadorId: req.utilizador.id, operacao: 'ALTERAR_ESTADO_TICKET', entidade: 'tickets_suporte', entidadeId: ticket.id, valoresNovos: { estado: req.body.estado }, enderecoIp: req.ip });
    req.app.get('io')?.to(`suporte:${req.params.id}`).emit('suporte:ticket-actualizado', ticket);
    return res.json({ sucesso: true, dados: ticket });
  } catch (erro) { return next(erro); }
}

export async function obterGestores(req, res, next) {
  try { return res.json({ sucesso: true, dados: await listarGestoresSuporte(req.utilizador) }); }
  catch (erro) { return next(erro); }
}
