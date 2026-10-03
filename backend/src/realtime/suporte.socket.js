import jwt from 'jsonwebtoken';
import { adicionarMensagem, obterTicketPorId } from '../services/suporte.service.js';

export function configurarSuporteEmTempoReal(io) {
  io.use((socket, next) => {
    try {
      socket.utilizador = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET);
      return next();
    } catch {
      return next(new Error('Autenticação inválida.'));
    }
  });

  io.on('connection', (socket) => {
    // Salas de perfil e utilizador permitem notificações sem expor dados a outros perfis.
    socket.join(`perfil:${socket.utilizador.perfil}`);
    socket.join(`utilizador:${socket.utilizador.id}`);
    socket.on('suporte:entrar', async (ticketId, responder) => {
      try {
        await obterTicketPorId(ticketId, socket.utilizador);
        await socket.join(`suporte:${ticketId}`);
        responder?.({ sucesso: true });
      } catch (erro) { responder?.({ sucesso: false, mensagem: erro.message }); }
    });

    socket.on('suporte:mensagem', async ({ ticketId, mensagem }, responder) => {
      try {
        const criada = await adicionarMensagem(ticketId, socket.utilizador, mensagem);
        io.to(`suporte:${ticketId}`).emit('suporte:mensagem', criada);
        responder?.({ sucesso: true, dados: criada });
      } catch (erro) { responder?.({ sucesso: false, mensagem: erro.message }); }
    });
  });
}
