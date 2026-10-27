import { Assento, Bilhete, Reserva, Trip } from '../models/index.js';
import { Op } from 'sequelize';

// Gera um mapa físico previsível. O primeiro e o último lugar de cada fila
// ficam junto às janelas e os blocos são separados pelo corredor central.
export function gerarMapaAssentos(capacidade, lugaresEsquerda = 2, lugaresDireita = 2) {
  const totalPorFila = lugaresEsquerda + lugaresDireita;
  return Array.from({ length: capacidade }, (_, indice) => {
    const posicao = indice % totalPorFila;
    return {
      numero: String(indice + 1),
      fila: Math.floor(indice / totalPorFila) + 1,
      coluna: String.fromCharCode(65 + posicao),
      lado: posicao < lugaresEsquerda ? 'ESQUERDO' : 'DIREITO',
      juntoJanela: posicao === 0 || posicao === totalPorFila - 1
    };
  });
}

// Cria os assentos numerados de um autocarro uma única vez.
export async function criarAssentosDoAutocarro(autocarroId, capacidade, transacao, configuracao = {}) {
  const assentos = gerarMapaAssentos(capacidade, configuracao.lugaresEsquerda, configuracao.lugaresDireita)
    .map((assento) => ({ ...assento, autocarroId }));
  return Assento.bulkCreate(assentos, { transaction: transacao, ignoreDuplicates: true });
}

// Devolve todos os assentos do autocarro e indica os que já foram vendidos na viagem.
export async function listarAssentosDaViagem(viagemId, utilizadorId = null) {
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

  const assentosEncontrados = await Assento.findAll({ where: { autocarroId: viagem.busId } });
  const assentos = ordenarAssentosNumericamente(assentosEncontrados);
  const agora = new Date();
  // A expiração também é persistida para manter a tabela coerente mesmo após
  // reinícios do servidor ou clientes que fecharam sem libertar o assento.
  await Reserva.update({ estado: 'EXPIRADA' }, {
    where: { viagemId, estado: 'PENDENTE', expiraEm: { [Op.lte]: agora } }
  });
  const [bilhetes, reservas] = await Promise.all([
    Bilhete.findAll({ where: { viagemId, estado: { [Op.in]: ['RESERVADO', 'EMITIDO'] } } }),
    Reserva.findAll({ where: { viagemId, estado: 'PENDENTE', expiraEm: { [Op.gt]: agora } } })
  ]);
  const ocupados = new Set(bilhetes.map((bilhete) => String(bilhete.assentoId)));
  const bloqueios = new Map(reservas.map((reserva) => [String(reserva.assentoId), reserva]));

  return assentos.map((assento) => ({
    id: assento.id,
    numero: assento.numero,
    fila: assento.fila,
    coluna: assento.coluna,
    lado: assento.lado,
    juntoJanela: assento.juntoJanela,
    ...calcularEstadoAssento({ assentoId: assento.id, ocupados, bloqueios, utilizadorId })
  }));
}

export function calcularEstadoAssento({ assentoId, ocupados, bloqueios, utilizadorId }) {
  const chave = String(assentoId);
  const vendido = ocupados.has(chave);
  const reserva = bloqueios.get(chave);
  const reservadoPorMim = Boolean(reserva && String(reserva.utilizadorId) === String(utilizadorId));
  return {
    disponivel: !vendido && (!reserva || reservadoPorMim),
    ocupado: vendido,
    reservadoTemporariamente: !vendido && Boolean(reserva) && !reservadoPorMim,
    reservadoPorMim,
    expiraEm: reservadoPorMim ? reserva.expiraEm : null
  };
}

// A coluna é textual para aceitar futuras marcações como 1A, mas a apresentação
// deve manter a ordem humana: 1, 2, 3 ... 10, 11, em vez da ordem alfabética.
export function ordenarAssentosNumericamente(assentos) {
  return [...assentos].sort((primeiro, segundo) => String(primeiro.numero).localeCompare(
    String(segundo.numero), 'pt', { numeric: true, sensitivity: 'base' }
  ));
}
