import { enviarAvisoManualViagem } from '../services/aviso-viagem.service.js';

export async function enviarAviso(req, res, next) {
  try {
    const resultado = await enviarAvisoManualViagem(req.params.id, req.body.mensagem, req.utilizador);
    return res.status(201).json({ sucesso: true, mensagem: `${resultado.totalDestinatarios} aviso(s) colocado(s) na fila de entrega.`, dados: resultado });
  } catch (erro) { return next(erro); }
}
