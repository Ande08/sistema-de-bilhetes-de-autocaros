import { Assento, Bilhete, Cupao, Empresa, Pagamento, Route, Trip } from '../models/index.js';

// Converte instâncias Sequelize numa estrutura estável e simples para o frontend.
export function normalizarBilhete(bilhete) {
  const dados = bilhete.toJSON ? bilhete.toJSON() : bilhete;
  const viagem = dados.Trip;
  return {
    id: dados.id,
    codigo: dados.codigo,
    nomePassageiro: dados.nomePassageiro,
    estado: dados.estado,
    preco: Number(dados.preco),
    precoOriginal: Number(dados.precoOriginal ?? dados.preco),
    desconto: Number(dados.desconto || 0),
    cupao: dados.Cupao ? { codigo: dados.Cupao.codigo, percentagem: Number(dados.Cupao.percentagem) } : null,
    criadoEm: dados.criado_em || dados.createdAt || null,
    assento: dados.Assento ? { id: dados.Assento.id, numero: dados.Assento.numero } : null,
    viagem: viagem ? {
      id: viagem.id,
      partidaEm: viagem.departureAt,
      chegadaPrevistaEm: viagem.arrivalExpectedAt,
      estado: viagem.status,
      empresa: viagem.Empresa ? { id: viagem.Empresa.id, nome: viagem.Empresa.nome, slug: viagem.Empresa.slug, logoUrl: viagem.Empresa.logoUrl || null } : null,
      origem: viagem.Route?.origin || '',
      destino: viagem.Route?.destination || ''
    } : null,
    pagamento: dados.Pagamento ? {
      id: dados.Pagamento.id,
      metodo: dados.Pagamento.metodo,
      referencia: dados.Pagamento.referencia,
      valor: Number(dados.Pagamento.valor),
      estado: dados.Pagamento.estado,
      criadoEm: dados.Pagamento.criado_em || dados.Pagamento.createdAt || null
    } : null
  };
}

export function construirResumoConta(bilhetes, agora = new Date()) {
  const normalizados = bilhetes.map(normalizarBilhete);
  const activos = normalizados.filter((item) => ['RESERVADO', 'EMITIDO'].includes(item.estado));
  const futuros = activos
    .filter((item) => item.viagem && new Date(item.viagem.partidaEm) > agora && item.viagem.estado === 'AGENDADA')
    .sort((a, b) => new Date(a.viagem.partidaEm) - new Date(b.viagem.partidaEm));
  const limitePagamentos = new Date(agora);
  limitePagamentos.setMonth(limitePagamentos.getMonth() - 6);
  const pagamentos = normalizados.filter((item) => item.pagamento).map((item) => ({ ...item.pagamento, bilheteCodigo: item.codigo }));

  return {
    proximaViagem: futuros[0] || null,
    totalBilhetesActivos: futuros.length,
    totalPagamentosSeisMeses: pagamentos.filter((item) => !item.criadoEm || new Date(item.criadoEm) >= limitePagamentos).length,
    viagensRecentes: [...normalizados].filter((item) => item.viagem).sort((a, b) => new Date(b.viagem.partidaEm) - new Date(a.viagem.partidaEm)).slice(0, 6),
    bilhetes: normalizados,
    pagamentos
  };
}

export async function obterResumoConta(utilizadorId) {
  const bilhetes = await Bilhete.findAll({
    where: { utilizadorId },
    include: [Pagamento, Assento, Cupao, { model: Trip, include: [Route, { model: Empresa, attributes: ['id', 'nome', 'slug', 'logoUrl'] }] }],
    order: [['id', 'DESC']],
    limit: 100
  });
  return construirResumoConta(bilhetes);
}
