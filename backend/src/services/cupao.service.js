import { Op } from 'sequelize';
import { Bilhete, Cupao } from '../models/index.js';

export function normalizarCodigoCupao(valor) {
  const codigo = String(valor || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(codigo)) {
    throw erroValidacao('O código deve ter entre 3 e 30 caracteres e usar apenas letras, números, hífen ou sublinhado.');
  }
  return codigo;
}

export function validarDadosCupao(dados = {}) {
  const percentagem = Number(dados.percentagem);
  const validoDe = new Date(dados.validoDe);
  const validoAte = new Date(dados.validoAte);
  const valorMinimo = dados.valorMinimo === '' || dados.valorMinimo == null ? 0 : Number(dados.valorMinimo);
  const limiteUtilizacoes = inteiroOpcional(dados.limiteUtilizacoes, 'limite total de utilizações');
  const limitePorUtilizador = inteiroPositivo(dados.limitePorUtilizador ?? 1, 'limite por cliente');
  const descricao = String(dados.descricao || '').trim();

  if (!Number.isFinite(percentagem) || percentagem < 1 || percentagem > 90) {
    throw erroValidacao('A percentagem do desconto deve estar entre 1% e 90%.');
  }
  if (Number.isNaN(validoDe.getTime()) || Number.isNaN(validoAte.getTime()) || validoAte <= validoDe) {
    throw erroValidacao('O fim da validade deve ser posterior ao início.');
  }
  if (!Number.isFinite(valorMinimo) || valorMinimo < 0) throw erroValidacao('O valor mínimo da compra é inválido.');
  if (descricao.length > 200) throw erroValidacao('A descrição deve ter no máximo 200 caracteres.');

  return {
    codigo: normalizarCodigoCupao(dados.codigo),
    descricao: descricao || null,
    percentagem: arredondar(percentagem),
    validoDe,
    validoAte,
    valorMinimo: arredondar(valorMinimo),
    limiteUtilizacoes,
    limitePorUtilizador,
    activo: dados.activo === undefined ? true : Boolean(dados.activo)
  };
}

export function calcularValoresCupao(preco, percentagem) {
  const precoOriginal = arredondar(Number(preco));
  const desconto = arredondar(precoOriginal * Number(percentagem) / 100);
  return { precoOriginal, desconto, valorFinal: arredondar(Math.max(0.01, precoOriginal - desconto)) };
}

export async function listarCupoesEmpresa(administrador) {
  garantirAdministradorEmpresa(administrador);
  return Cupao.findAll({ where: { empresaId: administrador.empresaId }, order: [['criado_em', 'DESC']] });
}

export async function criarCupaoEmpresa(dados, administrador) {
  garantirAdministradorEmpresa(administrador);
  const entrada = validarDadosCupao(dados);
  await garantirCodigoDisponivel(entrada.codigo, administrador.empresaId);
  return Cupao.create({ ...entrada, empresaId: administrador.empresaId, totalUtilizacoes: 0 });
}

export async function actualizarCupaoEmpresa(id, dados, administrador) {
  const cupao = await obterCupaoDaEmpresa(id, administrador);
  const entrada = validarDadosCupao({ ...cupao.toJSON(), ...dados });
  await garantirCodigoDisponivel(entrada.codigo, administrador.empresaId, cupao.id);
  await cupao.update(entrada);
  return cupao;
}

export async function definirEstadoCupaoEmpresa(id, activo, administrador) {
  const cupao = await obterCupaoDaEmpresa(id, administrador);
  if (typeof activo !== 'boolean') throw erroValidacao('O estado do cupom deve ser verdadeiro ou falso.');
  await cupao.update({ activo });
  return cupao;
}

export async function calcularPrecoComCupao({ codigo, viagem, utilizadorId, quantidade = 1, transaction = null, bloquear = false }) {
  const totalBilhetes = Number(quantidade);
  if (!Number.isInteger(totalBilhetes) || totalBilhetes < 1 || totalBilhetes > 6) throw erroValidacao('A compra deve ter entre 1 e 6 bilhetes.');
  const precoUnitarioOriginal = arredondar(Number(viagem.price));
  const precoOriginal = arredondar(precoUnitarioOriginal * totalBilhetes);
  if (!String(codigo || '').trim()) return { cupao: null, quantidade: totalBilhetes, precoUnitarioOriginal, descontoUnitario: 0, valorUnitarioFinal: precoUnitarioOriginal, precoOriginal, desconto: 0, valorFinal: precoOriginal };

  const codigoNormalizado = normalizarCodigoCupao(codigo);
  const cupao = await Cupao.findOne({
    where: { empresaId: viagem.empresaId, codigo: codigoNormalizado },
    transaction,
    ...(bloquear && transaction ? { lock: transaction.LOCK.UPDATE } : {})
  });
  if (!cupao) throw erroValidacao('Cupão inválido para esta empresa.');

  const agora = new Date();
  if (!cupao.activo) throw erroValidacao('Este cupão está desativado.');
  if (agora < new Date(cupao.validoDe)) throw erroValidacao('Este cupão ainda não está válido.');
  if (agora > new Date(cupao.validoAte)) throw erroValidacao('Este cupão expirou.');
  if (precoOriginal < Number(cupao.valorMinimo)) throw erroValidacao(`Este cupão exige uma compra mínima de ${Number(cupao.valorMinimo).toFixed(2)} MT.`);
  if (cupao.limiteUtilizacoes != null && cupao.totalUtilizacoes + totalBilhetes > cupao.limiteUtilizacoes) {
    throw erroValidacao('O limite total de utilizações deste cupão foi atingido.');
  }

  const utilizacoesDoCliente = await Bilhete.count({
    where: { cupaoId: cupao.id, utilizadorId }, transaction
  });
  if (utilizacoesDoCliente + totalBilhetes > cupao.limitePorUtilizador) {
    throw erroValidacao('Este cliente já atingiu o limite de utilização do cupão.');
  }

  const valoresUnitarios = calcularValoresCupao(precoUnitarioOriginal, cupao.percentagem);
  return {
    cupao,
    codigo: cupao.codigo,
    percentagem: Number(cupao.percentagem),
    quantidade: totalBilhetes,
    precoUnitarioOriginal,
    descontoUnitario: valoresUnitarios.desconto,
    valorUnitarioFinal: valoresUnitarios.valorFinal,
    precoOriginal,
    desconto: arredondar(valoresUnitarios.desconto * totalBilhetes),
    valorFinal: arredondar(valoresUnitarios.valorFinal * totalBilhetes)
  };
}

async function obterCupaoDaEmpresa(id, administrador) {
  garantirAdministradorEmpresa(administrador);
  const cupao = await Cupao.findOne({ where: { id, empresaId: administrador.empresaId } });
  if (!cupao) {
    const erro = new Error('Cupão não encontrado.'); erro.statusCode = 404; throw erro;
  }
  return cupao;
}

async function garantirCodigoDisponivel(codigo, empresaId, ignorarId = null) {
  const existente = await Cupao.findOne({
    where: { codigo, empresaId, ...(ignorarId && { id: { [Op.ne]: ignorarId } }) }
  });
  if (existente) {
    const erro = new Error('Já existe um cupão com este código na empresa.'); erro.statusCode = 409; throw erro;
  }
}

function garantirAdministradorEmpresa(administrador) {
  if (administrador?.perfil !== 'EMPRESA_ADMIN' || !administrador.empresaId) {
    const erro = new Error('Apenas o administrador da empresa pode gerir cupões.'); erro.statusCode = 403; throw erro;
  }
}

function inteiroPositivo(valor, campo) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) throw erroValidacao(`O ${campo} deve ser um número inteiro positivo.`);
  return numero;
}

function inteiroOpcional(valor, campo) {
  if (valor === '' || valor == null) return null;
  return inteiroPositivo(valor, campo);
}

function arredondar(valor) { return Math.round((Number(valor) + Number.EPSILON) * 100) / 100; }
function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
