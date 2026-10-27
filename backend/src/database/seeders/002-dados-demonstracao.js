import { Assento, Bus, Empresa, Route, Trip } from '../../models/index.js';
import { gerarMapaAssentos } from '../../services/assento.service.js';

export async function executar({ transaction }) {
  // Dados de demonstração só são criados quando explicitamente ativados.
  if (process.env.CRIAR_DADOS_DEMO !== 'true') return;
  const empresa = await Empresa.findOne({ where: { slug: 'viagem-bus' }, transaction });

  const [autocarro] = await Bus.findOrCreate({
    where: { registration: 'ABC-01-01' },
    defaults: { empresaId: empresa.id, model: 'Autocarro de demonstração', capacity: 40, active: true },
    transaction
  });
  const [rota] = await Route.findOrCreate({
    where: { empresaId: empresa.id, origin: 'Tete', destination: 'Maputo' },
    defaults: { originProvince: 'Tete', destinationProvince: 'Maputo Cidade', distanceKm: 1500, active: true },
    transaction
  });

  const assentos = gerarMapaAssentos(autocarro.capacity).map((assento) => ({ ...assento, autocarroId: autocarro.id }));
  await Assento.bulkCreate(assentos, { ignoreDuplicates: true, transaction });

  const partida = new Date();
  partida.setDate(partida.getDate() + 30);
  partida.setHours(8, 0, 0, 0);
  const chegada = new Date(partida);
  chegada.setHours(chegada.getHours() + 18);
  await Trip.findOrCreate({
    where: { routeId: rota.id, busId: autocarro.id, departureAt: partida },
    defaults: { empresaId: empresa.id, arrivalExpectedAt: chegada, price: 1500, status: 'AGENDADA' },
    transaction
  });
}
