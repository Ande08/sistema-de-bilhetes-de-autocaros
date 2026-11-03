import { Assento, Auditoria, Bilhete, Bus, Cupao, Empresa, Pagamento, Route, Trip, User } from '../models/index.js';
import { filtroEmpresa } from './empresa-escopo.service.js';
import { Op } from 'sequelize';

export function construirIndicadores({ passageiros, autocarros, viagens, bilhetes, receitaAprovada }) {
  return {
    passageiros: passageiros.filter((item) => item.perfil === 'PASSAGEIRO').length,
    autocarrosActivos: autocarros.filter((item) => item.active).length,
    viagensAgendadas: viagens.filter((item) => item.status === 'AGENDADA').length,
    bilhetesEmitidos: bilhetes.filter((item) => item.estado === 'EMITIDO').length,
    receitaAprovada: Number(receitaAprovada || 0)
  };
}

export function construirIndicadoresPlataforma({ empresas, usuariosActivos, bilhetes, viagens }) {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const vendasValidas = bilhetes.filter((item) => item.estado !== 'CANCELADO');
  return {
    empresasActivas: empresas.filter((item) => item.estadoCadastro === 'APROVADA' && item.activa).length,
    empresasPendentes: empresas.filter((item) => item.estadoCadastro === 'PENDENTE').length,
    usuariosActivos,
    vendasHoje: vendasValidas.filter((item) => new Date(item.criado_em) >= inicioHoje).length,
    vendasMes: vendasValidas.filter((item) => new Date(item.criado_em) >= inicioMes).length,
    volumeVendas: vendasValidas.length,
    viagensAgendadas: viagens.filter((item) => item.status === 'AGENDADA').length
  };
}

export async function obterPainelAdministrativo(utilizador) {
  return utilizador.perfil === 'ADMIN' ? obterPainelPlataforma() : obterPainelEmpresa(utilizador);
}

async function obterPainelPlataforma() {
  const [administradores, empresas, bilhetes, viagens, auditorias, usuariosActivos] = await Promise.all([
    User.findAll({
      where: { perfil: { [Op.in]: ['ADMIN', 'EMPRESA_ADMIN'] }, eliminadoEm: null },
      attributes: ['id', 'nome', 'apelido', 'telefone', 'perfil', 'activo', 'empresaId'],
      include: [{ model: Empresa, attributes: ['id', 'nome'], required: false }],
      order: [['id', 'DESC']]
    }),
    Empresa.findAll({
      where: { eliminadaEm: null },
      include: [{ model: User, where: { perfil: 'EMPRESA_ADMIN', eliminadoEm: null }, required: false, attributes: ['id', 'nome', 'apelido', 'telefone', 'activo'] }],
      order: [['nome', 'ASC']]
    }),
    Bilhete.findAll({ attributes: ['id', 'estado', 'criado_em'], include: [{ model: Trip, attributes: ['id', 'empresaId'], required: true }] }),
    Trip.findAll({ attributes: ['id', 'empresaId', 'status'] }),
    Auditoria.findAll({ include: [{ model: User, attributes: ['id', 'nome', 'apelido'] }], order: [['id', 'DESC']], limit: 100 }),
    User.count({ where: { activo: true, eliminadoEm: null } })
  ]);
  const volumeVendas = empresas.map((empresa) => {
    const vendas = bilhetes.filter((item) => String(item.Trip?.empresaId) === String(empresa.id));
    return {
      empresaId: empresa.id, empresa: empresa.nome,
      emitidos: vendas.filter((item) => item.estado === 'EMITIDO').length,
      utilizados: vendas.filter((item) => item.estado === 'UTILIZADO').length,
      cancelados: vendas.filter((item) => item.estado === 'CANCELADO').length,
      total: vendas.filter((item) => item.estado !== 'CANCELADO').length
    };
  });
  return {
    tipoPainel: 'PLATAFORMA',
    indicadores: construirIndicadoresPlataforma({ empresas, usuariosActivos, bilhetes, viagens }),
    passageiros: administradores, empresas, volumeVendas, auditorias,
    autocarros: [], rotas: [], viagens: [], bilhetes: [], empresa: null
  };
}

async function obterPainelEmpresa(utilizador) {
  const escopo = filtroEmpresa(utilizador);
  const [usuarios, autocarros, rotas, viagens, bilhetes, empresa, cupoes] = await Promise.all([
    User.findAll({ where: { eliminadoEm: null, empresaId: utilizador.empresaId }, attributes: ['id', 'nome', 'apelido', 'telefone', 'perfil', 'activo', 'empresaId'], order: [['id', 'DESC']], limit: 100 }),
    Bus.findAll({ where: escopo, order: [['id', 'DESC']], limit: 100 }),
    Route.findAll({ where: escopo, order: [['id', 'DESC']], limit: 100 }),
    Trip.findAll({ where: escopo, include: [Route, Bus], order: [['departureAt', 'DESC']], limit: 100 }),
    Bilhete.findAll({ include: [{ model: User, attributes: ['id', 'nome', 'apelido', 'telefone'] }, Assento, Cupao, { model: Trip, where: escopo, required: true, include: [Route, Bus] }, Pagamento], order: [['id', 'DESC']], limit: 100 }),
    Empresa.findOne({ where: { id: utilizador.empresaId, eliminadaEm: null } }),
    Cupao.findAll({ where: escopo, order: [['criado_em', 'DESC']], limit: 200 })
  ]);
  const receitaAprovada = bilhetes.reduce((total, item) => total + (item.Pagamento?.estado === 'APROVADO' ? Number(item.Pagamento.valor) : 0), 0);
  const passageirosIndicador = [...new Set(bilhetes.map((item) => item.utilizadorId).filter(Boolean))].map(() => ({ perfil: 'PASSAGEIRO' }));
  return {
    tipoPainel: 'EMPRESA',
    indicadores: construirIndicadores({ passageiros: passageirosIndicador, autocarros, viagens, bilhetes, receitaAprovada }),
    passageiros: usuarios, autocarros, rotas, viagens, bilhetes, auditorias: [], empresa, cupoes,
    empresas: [], volumeVendas: []
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
