import { sequelize } from '../config/database.js';
import { cancelarBilhete, cancelarViagem } from '../services/cancelamento.service.js';

export async function cancelarBilheteController(req, res, next) {
  const transacao = await sequelize.transaction();
  try {
    const bilhete = await cancelarBilhete(req.params.codigo, transacao);
    await transacao.commit();
    return res.json({ sucesso: true, mensagem: 'Bilhete cancelado e pagamento reembolsado.', dados: bilhete });
  } catch (erro) {
    await transacao.rollback();
    return next(erro);
  }
}

export async function cancelarViagemController(req, res, next) {
  try {
    const viagem = await cancelarViagem(req.params.id);
    return res.json({ sucesso: true, mensagem: 'Viagem cancelada.', dados: viagem });
  } catch (erro) { return next(erro); }
}
