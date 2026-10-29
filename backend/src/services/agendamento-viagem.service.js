import { Op } from 'sequelize';
import { Trip } from '../models/index.js';

const TIPOS_RECORRENCIA = new Set(['DIARIA', 'SEMANAL']);
const LIMITE_DIAS = 366;
const FUSO_MAPUTO = '+02:00';

/**
 * Gera as ocorrências concretas de um agendamento recorrente.
 * Cada ocorrência torna-se uma viagem independente, permitindo cancelamentos,
 * vendas e avisos sem alterar os restantes dias da série.
 */
export function gerarOcorrenciasRecorrentes(dados, agora = new Date()) {
  const tipo = String(dados.tipoAgendamento || '').toUpperCase();
  if (!TIPOS_RECORRENCIA.has(tipo)) {
    throw erroValidacao('O tipo de agendamento recorrente deve ser diário ou semanal.');
  }

  const inicio = validarDataCivil(dados.dataInicio, 'data inicial');
  const fim = validarDataCivil(dados.dataFim, 'data final');
  const hora = validarHora(dados.horaPartida);
  const duracaoMinutos = Number(dados.duracaoMinutos);
  if (!Number.isInteger(duracaoMinutos) || duracaoMinutos < 1 || duracaoMinutos > 2880) {
    throw erroValidacao('A duração prevista deve estar entre 1 e 2880 minutos.');
  }
  if (fim.valor < inicio.valor) throw erroValidacao('A data final deve ser igual ou posterior à data inicial.');

  const totalDias = Math.floor((fim.valor - inicio.valor) / 86400000) + 1;
  if (totalDias > LIMITE_DIAS) throw erroValidacao('O período recorrente não pode ultrapassar 366 dias.');

  const diasSemana = tipo === 'SEMANAL' ? normalizarDiasSemana(dados.diasSemana) : null;
  const ocorrencias = [];
  for (let indice = 0; indice < totalDias; indice += 1) {
    const data = new Date(inicio.valor + indice * 86400000);
    if (diasSemana && !diasSemana.has(data.getUTCDay())) continue;
    const dataCivil = data.toISOString().slice(0, 10);
    const partidaEm = new Date(`${dataCivil}T${hora}:00${FUSO_MAPUTO}`);
    if (partidaEm <= agora) continue;
    ocorrencias.push({
      departureAt: partidaEm,
      arrivalExpectedAt: new Date(partidaEm.getTime() + duracaoMinutos * 60000)
    });
  }

  if (!ocorrencias.length) throw erroValidacao('O agendamento não contém nenhuma partida futura nos dias escolhidos.');
  for (let indice = 1; indice < ocorrencias.length; indice += 1) {
    if (ocorrencias[indice - 1].arrivalExpectedAt > ocorrencias[indice].departureAt) {
      throw erroValidacao('A duração faz com que duas viagens desta recorrência usem o autocarro ao mesmo tempo.');
    }
  }
  return ocorrencias;
}

/**
 * Bloqueia sobreposições para que um autocarro não seja usado em duas viagens
 * simultâneas. A consulta deve decorrer na mesma transação que bloqueou o
 * registo do autocarro, evitando duas criações concorrentes.
 */
export async function garantirAutocarroDisponivel({ empresaId, autocarroId, ocorrencias, transaction }) {
  const fim = ocorrencias.at(-1).arrivalExpectedAt;
  const existentes = await Trip.findAll({
    where: {
      empresaId,
      busId: autocarroId,
      status: { [Op.ne]: 'CANCELADA' },
      departureAt: { [Op.lt]: fim }
    },
    order: [['departureAt', 'ASC']],
    transaction
  });

  for (const ocorrencia of ocorrencias) {
    const conflito = existentes.find((viagem) => {
      const partidaExistente = new Date(viagem.departureAt);
      // Viagens antigas sem chegada ocupam pelo menos o minuto da partida.
      const chegadaExistente = viagem.arrivalExpectedAt
        ? new Date(viagem.arrivalExpectedAt)
        : new Date(partidaExistente.getTime() + 60000);
      return partidaExistente < ocorrencia.arrivalExpectedAt && chegadaExistente > ocorrencia.departureAt;
    });
    if (conflito) {
      const erro = erroValidacao(`O autocarro já está ocupado na partida de ${formatarDataHora(ocorrencia.departureAt)}.`);
      erro.conflitoViagemId = conflito.id;
      throw erro;
    }
  }
}

export function criarOcorrenciaUnica({ partidaEm, chegadaPrevistaEm }) {
  const partida = new Date(partidaEm);
  const chegada = chegadaPrevistaEm ? new Date(chegadaPrevistaEm) : new Date(partida.getTime() + 60000);
  if (Number.isNaN(partida.getTime()) || Number.isNaN(chegada.getTime())) throw erroValidacao('As datas da viagem são inválidas.');
  if (partida <= new Date()) throw erroValidacao('A partida deve estar no futuro.');
  if (chegada <= partida) throw erroValidacao('A chegada prevista deve ser posterior à partida.');
  return [{ departureAt: partida, arrivalExpectedAt: chegadaPrevistaEm ? chegada : null, fimParaConflito: chegada }];
}

function normalizarDiasSemana(valor) {
  const itens = Array.isArray(valor) ? valor : valor === undefined ? [] : [valor];
  const dias = new Set(itens.map(Number));
  if (!dias.size || [...dias].some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
    throw erroValidacao('Selecione pelo menos um dia da semana válido.');
  }
  return dias;
}

function validarDataCivil(valor, nome) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) throw erroValidacao(`A ${nome} é inválida.`);
  const data = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) throw erroValidacao(`A ${nome} é inválida.`);
  return { valor: data.getTime() };
}

function validarHora(valor) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''))) throw erroValidacao('A hora de partida é inválida.');
  return valor;
}

function erroValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = 400;
  return erro;
}

function formatarDataHora(valor) {
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Maputo' }).format(valor);
}
