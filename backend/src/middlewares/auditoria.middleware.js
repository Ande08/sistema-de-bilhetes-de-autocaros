import { registarAuditoria } from '../services/auditoria.service.js';

export function auditarOperacaoAdministrativa(req, res, next) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const segmentos = req.path.split('/').filter(Boolean);
    registarAuditoria({
      utilizadorId: req.utilizador?.id,
      operacao: req.method,
      entidade: segmentos[0] || 'gestao',
      entidadeId: req.params.id || segmentos.find((item) => /^\d+$/.test(item)) || null,
      valoresNovos: req.body,
      enderecoIp: req.ip
    }).catch((erro) => console.error('Falha ao registar auditoria:', erro.message));
  });
  return next();
}
