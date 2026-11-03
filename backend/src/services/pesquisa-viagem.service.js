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

  // A validação no servidor impede pesquisas retroativas mesmo quando alguém
  // ignora o limite do campo HTML ou envia o pedido diretamente para a API.
  if (data < formatarDataMaputo(agora)) {
    const erro = new Error('A data da viagem não pode ser anterior a hoje.');
    erro.statusCode = 400;
    throw erro;
  }

  return {
    data,
    inicio: agora > inicioDoDia ? agora : inicioDoDia,
    fim: fimDoDia
  };
}

export function validarOrigemDestino({ origem, destino, origemProvincia, destinoProvincia }) {
  if (!origem || !destino) return;
  const mesmaCidade = normalizarLocalidade(origem) === normalizarLocalidade(destino);
  const mesmaProvincia = !origemProvincia || !destinoProvincia
    || normalizarLocalidade(origemProvincia) === normalizarLocalidade(destinoProvincia);
  if (mesmaCidade && mesmaProvincia) {
    const erro = new Error('A origem e o destino devem ser diferentes.');
    erro.statusCode = 400;
    throw erro;
  }
}

function normalizarLocalidade(valor) {
  return String(valor || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
