import jwt from 'jsonwebtoken';
import { adicionarMensagem, obterTicketPorId } from '../services/suporte.service.js';
import { Trip } from '../models/index.js';

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
    if (socket.utilizador.empresaId) socket.join(`empresa:${socket.utilizador.empresaId}`);

    // Cada viagem possui uma sala própria. Os clientes recebem apenas a
    // indicação de que o mapa mudou e voltam a consultar o estado autorizado.
    socket.on('assentos:entrar', async (viagemId, responder) => {
      try {
        const viagem = await Trip.findByPk(viagemId, { attributes: ['id', 'status', 'departureAt'] });
        if (!viagem || viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
          throw new Error('Esta viagem não está disponível para seleção de assentos.');
        }
        await socket.join(`assentos:${viagem.id}`);
        responder?.({ sucesso: true });
      } catch (erro) { responder?.({ sucesso: false, mensagem: erro.message }); }
    });
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
