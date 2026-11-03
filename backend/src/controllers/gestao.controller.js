import { randomUUID } from 'node:crypto';
import { Bus, Route, Trip } from '../models/index.js';
import { criarAssentosDoAutocarro } from '../services/assento.service.js';
import { definirEstadoEntidade, obterPainelAdministrativo } from '../services/administracao.service.js';
import { sequelize } from '../config/database.js';
import { actualizarUtilizadorAdministrativo, criarUtilizadorAdministrativo, definirEstadoUtilizador, eliminarUtilizadorAdministrativo, redefinirPalavraPasse } from '../services/utilizador-administracao.service.js';
import { filtroEmpresa, obterEmpresaParaCriacao } from '../services/empresa-escopo.service.js';
import { obterLocalidadeValida } from '../services/localidades.service.js';
import { actualizarPerfilEmpresa, obterPerfilEmpresa } from '../services/empresa-perfil.service.js';
import { actualizarEmpresaAdministrativa, criarEmpresaAdministrativa, decidirCadastroEmpresaAdministrativa, definirEstadoEmpresaAdministrativa, eliminarEmpresaAdministrativa, listarEmpresasAdministrativas, obterEmpresaAdministrativa } from '../services/empresa-administracao.service.js';
import { criarOcorrenciaUnica, garantirAutocarroDisponivel, gerarOcorrenciasRecorrentes } from '../services/agendamento-viagem.service.js';

export async function obterPainel(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterPainelAdministrativo(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function criarAutocarro(req, res, next) {
  let transacao;
  try {
    const { matricula, modelo, capacidade, lugaresEsquerda = 2, lugaresDireita = 2 } = req.body;
    const distribuicaoValida = Number.isInteger(lugaresEsquerda) && Number.isInteger(lugaresDireita)
      && lugaresEsquerda >= 1 && lugaresEsquerda <= 3 && lugaresDireita >= 1 && lugaresDireita <= 3;
    if (!matricula || !modelo || !Number.isInteger(capacidade) || capacidade <= 0 || capacidade > 120 || !distribuicaoValida) {
      const erro = new Error('Matrícula, modelo, capacidade entre 1 e 120 e distribuição válida são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }
    transacao = await sequelize.transaction();
    const autocarro = await Bus.create({
      empresaId: obterEmpresaParaCriacao(req.utilizador),
      registration: matricula, model: modelo, capacity: capacidade,
      seatsLeft: lugaresEsquerda, seatsRight: lugaresDireita
    }, { transaction: transacao });
    // A capacidade e a distribuição geram posição, corredor e janelas.
    await criarAssentosDoAutocarro(autocarro.id, capacidade, transacao, { lugaresEsquerda, lugaresDireita });
    await transacao.commit();
    return res.status(201).json({ sucesso: true, dados: autocarro });
  } catch (erro) {
    if (transacao && !transacao.finished) await transacao.rollback();
    return next(erro);
  }
}

export async function criarRota(req, res, next) {
  try {
    const origem = obterLocalidadeValida(req.body.origemProvincia, req.body.origem);
    const destino = obterLocalidadeValida(req.body.destinoProvincia, req.body.destino);
    if (origem.provincia === destino.provincia && origem.cidade === destino.cidade) {
      const erro = new Error('Origem e destino são obrigatórios e devem ser diferentes.');
      erro.statusCode = 400;
      throw erro;
    }
    const rota = await Route.create({
      empresaId: obterEmpresaParaCriacao(req.utilizador),
      originProvince: origem.provincia,
      origin: origem.cidade,
      destinationProvince: destino.provincia,
      destination: destino.cidade,
      distanceKm: req.body.distanciaKm
    });
    return res.status(201).json({ sucesso: true, dados: rota });
  } catch (erro) { return next(erro); }
}

export async function criarViagem(req, res, next) {
  let transacao;
  try {
    const { rotaId, autocarroId, partidaEm, chegadaPrevistaEm, preco, tipoAgendamento = 'UNICA' } = req.body;
    if (!rotaId || !autocarroId || !Number(preco) || Number(preco) <= 0) {
      const erro = new Error('Rota, autocarro e preço válido são obrigatórios.');
      erro.statusCode = 400;
      throw erro;
    }
    const recorrente = String(tipoAgendamento).toUpperCase() !== 'UNICA';
    if (!recorrente && !partidaEm) { const erro = new Error('A partida é obrigatória.'); erro.statusCode = 400; throw erro; }
    const ocorrencias = recorrente
      ? gerarOcorrenciasRecorrentes({ ...req.body, tipoAgendamento })
      : criarOcorrenciaUnica({ partidaEm, chegadaPrevistaEm });

    const empresaId = obterEmpresaParaCriacao(req.utilizador);
    transacao = await sequelize.transaction();
    // O bloqueio do autocarro serializa agendamentos concorrentes para a mesma viatura.
    const autocarro = await Bus.findOne({ where: { id: autocarroId, empresaId }, transaction: transacao, lock: transacao.LOCK.UPDATE });
    const rota = await Route.findOne({ where: { id: rotaId, empresaId }, transaction: transacao });
    if (!autocarro || !rota || !autocarro.active || !rota.active) {
      const erro = new Error('A rota ou o autocarro não foram encontrados.');
      erro.statusCode = 404;
      throw erro;
    }
    const ocorrenciasParaConflito = ocorrencias.map((item) => ({
      ...item,
      arrivalExpectedAt: item.arrivalExpectedAt || item.fimParaConflito
    }));
    await garantirAutocarroDisponivel({ empresaId, autocarroId, ocorrencias: ocorrenciasParaConflito, transaction: transacao });
    const tipoRecorrencia = recorrente ? String(tipoAgendamento).toUpperCase() : 'UNICA';
    const grupoRecorrencia = recorrente ? randomUUID() : null;
    const diasRecorrencia = tipoRecorrencia === 'SEMANAL'
      ? [...new Set((req.body.diasSemana || []).map(Number))].sort().join(',')
      : null;
    const viagens = await Trip.bulkCreate(ocorrencias.map((item) => ({
      empresaId, routeId: rotaId, busId: autocarroId,
      departureAt: item.departureAt, arrivalExpectedAt: item.arrivalExpectedAt,
      price: Number(preco), recurrenceType: tipoRecorrencia,
      recurrenceGroupId: grupoRecorrencia, recurrenceDays: diasRecorrencia,
      recurrenceStart: recorrente ? req.body.dataInicio : null,
      recurrenceEnd: recorrente ? req.body.dataFim : null
    })), { transaction: transacao });
    await transacao.commit();
    return res.status(201).json({ sucesso: true, dados: viagens.length === 1 ? viagens[0] : viagens, totalCriadas: viagens.length });
  } catch (erro) {
    if (transacao && !transacao.finished) await transacao.rollback();
    return next(erro);
  }
}

export async function definirEstadoPassageiro(req, res, next) {
  try {
    const utilizador = await definirEstadoUtilizador(req.params.id, req.body.activo, req.utilizador);
    return res.json({ sucesso: true, dados: dadosPublicosUtilizador(utilizador) });
  } catch (erro) { return next(erro); }
}

export async function criarUtilizador(req, res, next) {
  try { return res.status(201).json({ sucesso: true, dados: dadosPublicosUtilizador(await criarUtilizadorAdministrativo(req.body, req.utilizador)) }); }
  catch (erro) { return next(erro); }
}

export async function actualizarUtilizador(req, res, next) {
  try { return res.json({ sucesso: true, dados: dadosPublicosUtilizador(await actualizarUtilizadorAdministrativo(req.params.id, req.body, req.utilizador)) }); }
  catch (erro) { return next(erro); }
}

export async function redefinirSenhaUtilizador(req, res, next) {
  try { await redefinirPalavraPasse(req.params.id, req.body.novaPalavraPasse, req.utilizador); return res.json({ sucesso: true, dados: { mensagem: 'Palavra-passe redefinida com sucesso.' } }); }
  catch (erro) { return next(erro); }
}

export async function criarEmpresa(req, res, next) {
  try {
    const resultado = await criarEmpresaAdministrativa(req.body, req.utilizador);
    return res.status(201).json({
      sucesso: true,
      dados: {
        empresa: resultado.empresa,
        responsavel: dadosPublicosUtilizador(resultado.responsavel)
      }
    });
  } catch (erro) { return next(erro); }
}

export async function listarEmpresasGestao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await listarEmpresasAdministrativas(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function obterEmpresaGestao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterEmpresaAdministrativa(req.params.id, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function actualizarEmpresaGestao(req, res, next) {
  try { return res.json({ sucesso: true, dados: await actualizarEmpresaAdministrativa(req.params.id, req.body, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function definirEstadoEmpresa(req, res, next) {
  try { return res.json({ sucesso: true, dados: await definirEstadoEmpresaAdministrativa(req.params.id, req.body.activa, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function decidirCadastroEmpresa(req, res, next) {
  try { return res.json({ sucesso: true, dados: await decidirCadastroEmpresaAdministrativa(req.params.id, req.body.decisao, req.body.motivo, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function eliminarEmpresa(req, res, next) {
  try {
    await eliminarEmpresaAdministrativa(req.params.id, req.utilizador);
    return res.json({ sucesso: true, dados: { mensagem: 'Empresa eliminada com sucesso.' } });
  } catch (erro) { return next(erro); }
}

export async function obterEmpresa(req, res, next) {
  try { return res.json({ sucesso: true, dados: await obterPerfilEmpresa(req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function actualizarEmpresa(req, res, next) {
  try { return res.json({ sucesso: true, dados: await actualizarPerfilEmpresa(req.utilizador, req.body) }); }
  catch (erro) { return next(erro); }
}

export async function eliminarUtilizador(req, res, next) {
  try {
    await eliminarUtilizadorAdministrativo(req.params.id, req.utilizador);
    return res.json({ sucesso: true, dados: { mensagem: 'Usuário eliminado com sucesso.' } });
  } catch (erro) { return next(erro); }
}

function dadosPublicosUtilizador(utilizador) {
  const { palavraPasseHash: _segredo, email: _emailAntigo, ...dados } = utilizador.toJSON();
  return { ...dados, nomeCompleto: `${dados.nome} ${dados.apelido}` };
}

export async function definirEstadoAutocarro(req, res, next) {
  try { return res.json({ sucesso: true, dados: await definirEstadoEntidade(Bus, req.params.id, req.body.activo, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function definirEstadoRota(req, res, next) {
  try { return res.json({ sucesso: true, dados: await definirEstadoEntidade(Route, req.params.id, req.body.activo, req.utilizador) }); }
  catch (erro) { return next(erro); }
}

export async function actualizarViagem(req, res, next) {
  try {
    const viagem = await Trip.findOne({ where: { id: req.params.id, ...filtroEmpresa(req.utilizador) } });
    if (!viagem) { const erro = new Error('Viagem não encontrada.'); erro.statusCode = 404; throw erro; }
    const alteracoes = {};
    if (req.body.partidaEm) alteracoes.departureAt = req.body.partidaEm;
    if (req.body.chegadaPrevistaEm) alteracoes.arrivalExpectedAt = req.body.chegadaPrevistaEm;
    if (req.body.preco !== undefined) {
      if (Number(req.body.preco) <= 0) { const erro = new Error('O preço deve ser superior a zero.'); erro.statusCode = 400; throw erro; }
      alteracoes.price = req.body.preco;
    }
    await viagem.update(alteracoes);
    return res.json({ sucesso: true, dados: viagem });
  } catch (erro) { return next(erro); }
}
