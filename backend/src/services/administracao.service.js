import { Assento, Auditoria, Bilhete, Bus, Empresa, Pagamento, Route, Trip, User } from '../models/index.js';
import { filtroEmpresa } from './empresa-escopo.service.js';

export function construirIndicadores({ passageiros, autocarros, viagens, bilhetes, receitaAprovada }) {
  return {
    passageiros: passageiros.filter((item) => item.perfil === 'PASSAGEIRO').length,
    autocarrosActivos: autocarros.filter((item) => item.active).length,
    viagensAgendadas: viagens.filter((item) => item.status === 'AGENDADA').length,
    bilhetesEmitidos: bilhetes.filter((item) => item.estado === 'EMITIDO').length,
    receitaAprovada: Number(receitaAprovada || 0)
  };
}

export async function obterPainelAdministrativo(utilizador) {
  const escopo = filtroEmpresa(utilizador);
  const filtroUtilizadores = utilizador.perfil === 'ADMIN'
    ? { eliminadoEm: null }
    : { eliminadoEm: null, empresaId: utilizador.empresaId };
  const filtroAuditoria = utilizador.perfil === 'ADMIN'
    ? { model: User, attributes: ['id', 'nome', 'apelido', 'telefone'] }
    : { model: User, attributes: ['id', 'nome', 'apelido', 'telefone'], where: { empresaId: utilizador.empresaId }, required: true };
  const [passageiros, autocarros, rotas, viagens, bilhetes, auditorias, empresa] = await Promise.all([
    User.findAll({ where: filtroUtilizadores, attributes: ['id', 'nome', 'apelido', 'telefone', 'perfil', 'activo', 'empresaId'], order: [['id', 'DESC']], limit: 100 }),
    Bus.findAll({ where: escopo, order: [['id', 'DESC']], limit: 100 }),
    Route.findAll({ where: escopo, order: [['id', 'DESC']], limit: 100 }),
    Trip.findAll({ where: escopo, include: [Route, Bus], order: [['departureAt', 'DESC']], limit: 100 }),
    Bilhete.findAll({ include: [{ model: User, attributes: ['id', 'nome', 'apelido', 'telefone'] }, Assento, { model: Trip, where: escopo, required: true, include: [Route, Bus] }, Pagamento], order: [['id', 'DESC']], limit: 100 }),
    Auditoria.findAll({ include: [filtroAuditoria], order: [['id', 'DESC']], limit: 100 }),
    utilizador.empresaId ? Empresa.findByPk(utilizador.empresaId) : null
  ]);
  const receitaAprovada = bilhetes.reduce((total, item) => total + (item.Pagamento?.estado === 'APROVADO' ? Number(item.Pagamento.valor) : 0), 0);
  const passageirosIndicador = utilizador.perfil === 'ADMIN'
    ? passageiros
    : [...new Set(bilhetes.map((item) => item.utilizadorId).filter(Boolean))].map(() => ({ perfil: 'PASSAGEIRO' }));

  return {
    indicadores: construirIndicadores({ passageiros: passageirosIndicador, autocarros, viagens, bilhetes, receitaAprovada }),
    passageiros,
    autocarros,
    rotas,
    viagens,
    bilhetes,
    auditorias,
    empresa
  };
}

export async function definirEstadoEntidade(Modelo, id, activo, utilizador) {
  const entidade = await Modelo.findOne({ where: { id, ...filtroEmpresa(utilizador) } });
  if (!entidade) {
    const erro = new Error('Registo não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }
  const campo = Modelo === Route ? 'active' : Modelo === Bus ? 'active' : 'activo';
  await entidade.update({ [campo]: Boolean(activo) });
  return entidade;
}
