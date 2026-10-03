import { Auditoria } from '../models/index.js';

export async function registarAuditoria({ utilizadorId, operacao, entidade, entidadeId, valoresAnteriores, valoresNovos, enderecoIp }, opcoes = {}) {
  return Auditoria.create({ utilizadorId, operacao, entidade, entidadeId, valoresAnteriores, valoresNovos, enderecoIp }, opcoes);
}
