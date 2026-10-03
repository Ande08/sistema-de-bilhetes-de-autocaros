import { Assento, Bus, Route, Trip } from '../../models/index.js';

export async function executar({ transaction }) {
  // Dados de demonstração só são criados quando explicitamente ativados.
  if (process.env.CRIAR_DADOS_DEMO !== 'true') return;

  const [autocarro] = await Bus.findOrCreate({
    where: { registration: 'ABC-01-01' },
    defaults: { model: 'Autocarro de demonstração', capacity: 40, active: true },
    transaction
  });
  const [rota] = await Route.findOrCreate({
    where: { origin: 'Tete', destination: 'Maputo' },
    defaults: { distanceKm: 1500, active: true },
    transaction
  });

  const assentos = Array.from({ length: autocarro.capacity }, (_, indice) => ({ autocarroId: autocarro.id, numero: String(indice + 1) }));
  await Assento.bulkCreate(assentos, { ignoreDuplicates: true, transaction });

  const partida = new Date();
  partida.setDate(partida.getDate() + 30);
  partida.setHours(8, 0, 0, 0);
  const chegada = new Date(partida);
  chegada.setHours(chegada.getHours() + 18);
  await Trip.findOrCreate({
    where: { routeId: rota.id, busId: autocarro.id, departureAt: partida },
    defaults: { arrivalExpectedAt: chegada, price: 1500, status: 'AGENDADA' },
    transaction
  });
}
