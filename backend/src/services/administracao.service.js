import { Bilhete, Bus, Pagamento, Route, Trip, User } from '../models/index.js';

export function construirIndicadores({ passageiros, autocarros, viagens, bilhetes, receitaAprovada }) {
  return {
    passageiros: passageiros.filter((item) => item.perfil === 'PASSAGEIRO').length,
    autocarrosActivos: autocarros.filter((item) => item.active).length,
    viagensAgendadas: viagens.filter((item) => item.status === 'AGENDADA').length,
    bilhetesEmitidos: bilhetes.filter((item) => item.estado === 'EMITIDO').length,
    receitaAprovada: Number(receitaAprovada || 0)
  };
}

export async function obterPainelAdministrativo() {
  const [passageiros, autocarros, rotas, viagens, bilhetes, receitaAprovada] = await Promise.all([
    User.findAll({ attributes: ['id', 'nome', 'email', 'perfil', 'activo'], order: [['id', 'DESC']], limit: 100 }),
    Bus.findAll({ order: [['id', 'DESC']], limit: 100 }),
    Route.findAll({ order: [['id', 'DESC']], limit: 100 }),
    Trip.findAll({ include: [Route, Bus], order: [['departureAt', 'DESC']], limit: 100 }),
    Bilhete.findAll({ include: [{ model: User, attributes: ['id', 'nome', 'email'] }, { model: Trip, include: [Route] }, Pagamento], order: [['id', 'DESC']], limit: 100 }),
    Pagamento.sum('valor', { where: { estado: 'APROVADO' } })
  ]);

  return {
    indicadores: construirIndicadores({ passageiros, autocarros, viagens, bilhetes, receitaAprovada }),
    passageiros,
    autocarros,
    rotas,
    viagens,
    bilhetes
  };
}

export async function definirEstadoEntidade(Modelo, id, activo) {
  const entidade = await Modelo.findByPk(id);
  if (!entidade) {
    const erro = new Error('Registo não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }
  const campo = Modelo === Route ? 'active' : Modelo === Bus ? 'active' : 'activo';
  await entidade.update({ [campo]: Boolean(activo) });
  return entidade;
}
