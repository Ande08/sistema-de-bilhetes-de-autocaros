import { Assento, Bilhete, Bus, Trip } from '../models/index.js';
import { Op } from 'sequelize';

// Cria os assentos numerados de um autocarro uma única vez.
export async function criarAssentosDoAutocarro(autocarroId, capacidade, transacao) {
  const assentos = Array.from({ length: capacidade }, (_, indice) => ({
    autocarroId,
    numero: String(indice + 1)
  }));
  return Assento.bulkCreate(assentos, { transaction: transacao, ignoreDuplicates: true });
}

// Devolve todos os assentos do autocarro e indica os que já foram vendidos na viagem.
export async function listarAssentosDaViagem(viagemId) {
  const viagem = await Trip.findByPk(viagemId);
  if (!viagem) {
    const erro = new Error('Viagem não encontrada.');
    erro.statusCode = 404;
    throw erro;
  }
  if (viagem.status !== 'AGENDADA' || new Date(viagem.departureAt) <= new Date()) {
    const erro = new Error('Esta viagem não está disponível para seleção de assentos.');
    erro.statusCode = 409;
    throw erro;
  }

  const assentos = await Assento.findAll({ where: { autocarroId: viagem.busId }, order: [['numero', 'ASC']] });
  const bilhetes = await Bilhete.findAll({ where: { viagemId, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } } });
  const ocupados = new Set(bilhetes.map((bilhete) => String(bilhete.assentoId)));

  return assentos.map((assento) => ({
    id: assento.id,
    numero: assento.numero,
    disponivel: !ocupados.has(String(assento.id))
  }));
}
