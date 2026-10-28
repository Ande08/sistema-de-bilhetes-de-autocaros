import { Auditoria } from '../models/index.js';

export async function registarAuditoria({ utilizadorId, operacao, entidade, entidadeId, valoresAnteriores, valoresNovos, enderecoIp }, opcoes = {}) {
  return Auditoria.create({
    utilizadorId, operacao, entidade, entidadeId, valoresAnteriores, valoresNovos,
    enderecoIp: normalizarEnderecoIp(enderecoIp)
  }, opcoes);
}

export function normalizarEnderecoIp(enderecoIp) {
  if (!enderecoIp) return null;
  let valor = String(enderecoIp).trim();
  if (valor.startsWith('::ffff:')) valor = valor.slice(7);
  if (valor === '::1') valor = '127.0.0.1';
  return valor.slice(0, 64) || null;
}
