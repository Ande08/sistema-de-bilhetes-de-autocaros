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
      // Segredos nunca podem ser copiados para o histórico de auditoria.
      valoresNovos: ocultarDadosSensiveis(req.body),
      enderecoIp: req.ip
    }).catch((erro) => console.error('Falha ao registar auditoria:', erro.message));
  });
  return next();
}

export function ocultarDadosSensiveis(valor) {
  if (Array.isArray(valor)) return valor.map(ocultarDadosSensiveis);
  if (!valor || typeof valor !== 'object') return valor;
  return Object.fromEntries(Object.entries(valor).map(([chave, conteudo]) => [chave, /password|palavraPasse|apiKey|secret|token|logo/i.test(chave) ? '[PROTEGIDO]' : ocultarDadosSensiveis(conteudo)]));
}
