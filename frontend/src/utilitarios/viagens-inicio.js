const ESTADOS_BILHETE_ACTIVO = new Set(['EMITIDO', 'RESERVADO']);

/**
 * Informa se o passageiro já possui uma viagem válida no dia atual.
 * A comparação usa o calendário local do dispositivo, que é o calendário
 * apresentado ao cliente na interface.
 */
export function temViagemActivaHoje(bilhetes, agora = new Date()) {
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return bilhetes.some((bilhete) => {
    const partida = bilhete.viagem?.partidaEm ? new Date(bilhete.viagem.partidaEm) : null;
    return ESTADOS_BILHETE_ACTIVO.has(bilhete.estado)
      && bilhete.viagem?.estado === 'AGENDADA'
      && partida && partida >= inicio && partida < fim;
  });
}

export function normalizarLocalizacaoHabitual(valor) {
  if (!valor || typeof valor !== 'object') return null;
  const provincia = String(valor.provincia || '').trim();
  const cidade = String(valor.cidade || '').trim();
  return provincia && cidade ? { provincia, cidade } : null;
}

/** Devolve YYYY-MM-DD no calendário de Moçambique, sem depender do UTC. */
export function obterDataHojeMaputo(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(agora);
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}
