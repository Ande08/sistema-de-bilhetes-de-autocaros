import { Op } from 'sequelize';
import { AvaliacaoEmpresa, Bilhete, Empresa, Route, Trip, User } from '../models/index.js';
import { LOCALIDADES_MOCAMBIQUE } from '../services/localidades.service.js';
import { removerDadosSensiveis } from '../services/dados-assistente.service.js';

export function listarLocalidades(_req, res) {
  return res.json({ sucesso: true, dados: LOCALIDADES_MOCAMBIQUE });
}

export async function listarEmpresas(_req, res, next) {
  try {
    const empresas = await Empresa.findAll({
      where: { activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null },
      attributes: ['id', 'nome', 'slug', 'logoUrl', 'descricao', 'website'],
      order: [['nome', 'ASC']]
    });
    const avaliacoes = await AvaliacaoEmpresa.findAll({
      where: { empresaId: empresas.map((item) => item.id) }, attributes: ['empresaId', 'classificacao']
    });
    return res.json({ sucesso: true, dados: empresas.map((empresa) => adicionarResumoAvaliacoes(empresa, avaliacoes)) });
  } catch (erro) { return next(erro); }
}

export async function obterEmpresaPublica(req, res, next) {
  try {
    const empresa = await Empresa.findOne({
      where: { slug: req.params.slug, activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null },
      attributes: ['id', 'nome', 'slug', 'logoUrl', 'descricao', 'website', 'telefone']
    });
    if (!empresa) { const erro = new Error('Empresa não encontrada.'); erro.statusCode = 404; throw erro; }
    const [avaliacoes, viagens] = await Promise.all([
      AvaliacaoEmpresa.findAll({
        where: { empresaId: empresa.id },
        include: [{ model: User, as: 'Autor', attributes: ['id', 'nome'] }],
        order: [['criado_em', 'DESC']], limit: 20
      }),
      Trip.findAll({
        where: { empresaId: empresa.id, status: 'AGENDADA', departureAt: { [Op.gt]: new Date() } },
        include: [{ model: Route, attributes: ['origin', 'destination'] }],
        order: [['departureAt', 'ASC']], limit: 12
      })
    ]);
    const dados = adicionarResumoAvaliacoes(empresa, avaliacoes);
    const avaliacoesPublicas = avaliacoes.map((item) => ({
      id: item.id, classificacao: item.classificacao, comentario: item.comentario,
      criado_em: item.criado_em, Autor: item.Autor ? { nome: item.Autor.nome } : null
    }));
    return res.json({ sucesso: true, dados: { ...dados, avaliacoes: avaliacoesPublicas, viagens } });
  } catch (erro) { return next(erro); }
}

export async function avaliarEmpresa(req, res, next) {
  try {
    if (req.utilizador.perfil !== 'PASSAGEIRO') { const erro = new Error('Apenas clientes podem avaliar empresas.'); erro.statusCode = 403; throw erro; }
    const classificacao = Number(req.body.classificacao);
    const comentario = String(req.body.comentario || '').trim();
    if (!Number.isInteger(classificacao) || classificacao < 1 || classificacao > 5 || comentario.length > 600) {
      const erro = new Error('A classificação deve estar entre 1 e 5 e o comentário pode ter até 600 caracteres.'); erro.statusCode = 400; throw erro;
    }
    if (comentario && removerDadosSensiveis(comentario) !== comentario) {
      const erro = new Error('Não inclua contactos, documentos, dados de cartão, palavra-passe ou outros dados pessoais na avaliação pública.'); erro.statusCode = 400; throw erro;
    }
    const bilhete = await Bilhete.findOne({
      where: { utilizadorId: req.utilizador.id, estado: { [Op.ne]: 'CANCELADO' } },
      include: [{ model: Trip, where: { empresaId: req.params.id }, required: true }]
    });
    if (!bilhete) { const erro = new Error('Só pode avaliar uma empresa depois de comprar um bilhete válido dessa empresa.'); erro.statusCode = 403; throw erro; }
    const [avaliacao, criada] = await AvaliacaoEmpresa.findOrCreate({
      where: { empresaId: req.params.id, utilizadorId: req.utilizador.id },
      defaults: { classificacao, comentario: comentario || null }
    });
    if (!criada) await avaliacao.update({ classificacao, comentario: comentario || null });
    return res.json({ sucesso: true, dados: avaliacao });
  } catch (erro) { return next(erro); }
}

function adicionarResumoAvaliacoes(empresa, avaliacoes) {
  const dados = empresa.toJSON ? empresa.toJSON() : empresa;
  const itens = avaliacoes.filter((item) => String(item.empresaId) === String(empresa.id));
  const media = itens.length ? itens.reduce((total, item) => total + Number(item.classificacao), 0) / itens.length : 0;
  return { ...dados, avaliacaoMedia: Number(media.toFixed(1)), totalAvaliacoes: itens.length };
}
