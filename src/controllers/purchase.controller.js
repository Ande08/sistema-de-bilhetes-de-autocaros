import { ServicoPagamento } from '../services/payment.service.js';
import { ServicoBilhete } from '../services/ticket.service.js';
import { store } from '../data/store.js';

const servicoPagamento = new ServicoPagamento();
const servicoBilhete = new ServicoBilhete();

export function createPurchase(req, res, next) {
  try {
    const { passenger, tripId, seat, paymentMethod } = req.body;
    const trip = store.trips.find((item) => item.id === Number(tripId));

    if (!passenger?.name || !seat?.id || !trip) {
      const error = new Error('Passageiro, viagem e assento são obrigatórios');
      error.statusCode = 400;
      throw error;
    }

    if (trip.availableSeats <= 0) {
      const error = new Error('Não existem assentos disponíveis nesta viagem');
      error.statusCode = 409;
      throw error;
    }

    const pagamento = servicoPagamento.processar({
      metodo: paymentMethod,
      valor: trip.price
    });

    if (pagamento.estado !== 'APROVADO') {
      const error = new Error('Pagamento rejeitado');
      error.statusCode = 402;
      throw error;
    }

    const bilhete = servicoBilhete.emitir({
      passageiro: { nome: passenger.name },
      viagem: { id: trip.id, origem: trip.origin, destino: trip.destination, partidaEm: trip.departureAt },
      assento: { id: seat.id, numero: seat.number },
      pagamento,
      preco: trip.price
    });

    trip.availableSeats -= 1;
    store.payments.push(pagamento);
    store.tickets.push(bilhete);

    return res.status(201).json({ sucesso: true, dados: { pagamento, bilhete } });
  } catch (error) {
    return next(error);
  }
}

export function getTicket(req, res, next) {
  const ticket = store.tickets.find((item) => item.code === req.params.code);
  if (!ticket) {
    const error = new Error('Bilhete não encontrado');
    error.statusCode = 404;
    return next(error);
  }
  return res.json({ success: true, data: ticket });
}
