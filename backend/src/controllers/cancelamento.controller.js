import { sequelize } from '../config/database.js';
import { cancelarBilhete, cancelarViagem } from '../services/cancelamento.service.js';
import { registarAuditoria } from '../services/auditoria.service.js';

export async function cancelarBilheteController(req, res, next) {
  let transacao;
  try {
    transacao = await sequelize.transaction();
    const bilhete = await cancelarBilhete(req.params.codigo, req.utilizador, transacao);
    await transacao.commit();
    return res.json({ sucesso: true, mensagem: 'Bilhete cancelado e pagamento reembolsado.', dados: bilhete });
  } catch (erro) {
    if (transacao && !transacao.finished) await transacao.rollback();
    return next(erro);
  }
}

export async function cancelarViagemController(req, res, next) {
  let transacao;
  try {
    transacao = await sequelize.transaction();
    const viagem = await cancelarViagem(req.params.id, req.utilizador, transacao);
    await registarAuditoria({ utilizadorId: req.utilizador.id, operacao: 'CANCELAR', entidade: 'viagens', entidadeId: req.params.id, valoresNovos: { estado: 'CANCELADA' }, enderecoIp: req.ip }, { transaction: transacao });
    await transacao.commit();
    return res.json({ sucesso: true, mensagem: 'Viagem cancelada.', dados: viagem });
  } catch (erro) {
    if (transacao && !transacao.finished) await transacao.rollback();
    return next(erro);
  }
}
