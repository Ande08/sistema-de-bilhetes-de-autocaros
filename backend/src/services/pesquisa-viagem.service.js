const FUSO_MAPUTO = 'Africa/Maputo';

// Sem uma data explícita, a pesquisa começa no momento atual e não define fim,
// permitindo ordenar primeiro as viagens restantes de hoje e depois as dos
// dias seguintes. Uma data explícita limita os resultados ao dia escolhido.
export function obterIntervaloPesquisaViagens(dataInformada, agora = new Date()) {
  const data = String(dataInformada || '').trim();
  if (!data) return { data: null, inicio: agora, fim: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw erroDataInvalida();

  const inicioDoDia = new Date(`${data}T00:00:00.000+02:00`);
  const fimDoDia = new Date(`${data}T23:59:59.999+02:00`);
  if (Number.isNaN(inicioDoDia.getTime()) || formatarDataMaputo(inicioDoDia) !== data) {
    throw erroDataInvalida();
  }

  return {
    data,
    inicio: agora > inicioDoDia ? agora : inicioDoDia,
    fim: fimDoDia
  };
}

function formatarDataMaputo(data) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_MAPUTO, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(data);
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

function erroDataInvalida() {
  const erro = new Error('A data informada é inválida.');
  erro.statusCode = 400;
  return erro;
}
