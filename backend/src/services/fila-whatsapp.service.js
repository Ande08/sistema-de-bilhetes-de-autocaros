import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { EnvioWhatsapp } from '../models/index.js';
import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';

const INTERVALO_FILA_MS = 2000;
const INTERVALO_ENTRE_ENVIOS_MS = 900;
const TAMANHO_LOTE = 20;

export async function enfileirarEnvioWhatsapp(dados, opcoes = {}) {
  const [envio] = await EnvioWhatsapp.findOrCreate({
    where: { chaveIdempotencia: dados.chaveIdempotencia },
    defaults: {
      tipo: dados.tipo, utilizadorId: dados.utilizadorId || null, viagemId: dados.viagemId || null,
      telefone: dados.telefone, mensagem: dados.mensagem, chaveIdempotencia: dados.chaveIdempotencia,
      prioridade: dados.prioridade ?? 10, maxTentativas: dados.maxTentativas ?? 8,
      proximaTentativaEm: new Date(), expiraEm: dados.expiraEm || null
    },
    transaction: opcoes.transaction
  });
  if (!opcoes.transaction) processadorFilaWhatsapp.acordar();
  return envio;
}

export async function enfileirarOtpWhatsapp({ verificacaoId, telefone, codigo, validadeMinutos, expiraEm }) {
  const envio = await enfileirarEnvioWhatsapp({
    tipo: 'OTP', telefone, prioridade: 100, maxTentativas: 6, expiraEm,
    chaveIdempotencia: `OTP:${verificacaoId}`,
    mensagem: `Viagem Bus\n\nO seu código de confirmação é: ${codigo}\n\nO código expira em ${validadeMinutos} minutos. Não partilhe este código com ninguém.`
  });
  return { fornecedor: 'WHATSAPP_BAILEYS_FILA', identificador: String(envio.id), estado: envio.estado };
}

export async function obterResumoFilaWhatsapp() {
  const [agrupados, recentes] = await Promise.all([
    EnvioWhatsapp.findAll({ attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'total']], group: ['estado'], raw: true }),
    EnvioWhatsapp.findAll({ attributes: { exclude: ['mensagem'] }, order: [['id', 'DESC']], limit: 20 })
  ]);
  const contagens = { PENDENTE: 0, PROCESSANDO: 0, ENVIADO: 0, FALHADO: 0, EXPIRADO: 0 };
  agrupados.forEach((item) => { contagens[item.estado] = Number(item.total); });
  return {
    contagens,
    recentes: recentes.map((item) => ({
      id: item.id, tipo: item.tipo, estado: item.estado, tentativas: item.tentativas,
      telefone: mascararTelefone(item.telefone), viagemId: item.viagemId,
      ultimoErro: item.ultimoErro, enviadoEm: item.enviadoEm, criadoEm: item.criado_em
    }))
  };
}

export async function repetirEnvioWhatsapp(id) {
  const envio = await EnvioWhatsapp.findByPk(id);
  if (!envio) erroHttp('Envio WhatsApp não encontrado.', 404);
  if (!['FALHADO', 'EXPIRADO'].includes(envio.estado)) erroHttp('Apenas envios falhados ou expirados podem ser repetidos.', 409);
  if (envio.tipo === 'OTP') erroHttp('Um OTP expirado deve ser solicitado novamente pelo utilizador.', 409);
  await envio.update({ estado: 'PENDENTE', tentativas: 0, proximaTentativaEm: new Date(), expiraEm: null, ultimoErro: null });
  processadorFilaWhatsapp.acordar();
  return envio;
}

class ProcessadorFilaWhatsapp {
  constructor() { this.aProcessar = false; this.temporizador = null; this.iniciado = false; }

  async iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    // Um encerramento inesperado não pode deixar mensagens presas em PROCESSANDO.
    await EnvioWhatsapp.update({ estado: 'PENDENTE', proximaTentativaEm: new Date() }, { where: { estado: 'PROCESSANDO' } });
    await limparHistoricoAntigo();
    this.temporizador = setInterval(() => this.processar().catch((erro) => console.error('Falha no processador WhatsApp:', erro.message)), INTERVALO_FILA_MS);
    this.temporizador.unref?.();
    this.acordar();
  }

  acordar() { setTimeout(() => this.processar().catch((erro) => console.error('Falha no processador WhatsApp:', erro.message)), 0); }

  async processar() {
    if (this.aProcessar || servicoWhatsApp.obterEstado().estado !== 'LIGADO') return;
    this.aProcessar = true;
    try {
      await EnvioWhatsapp.update({ estado: 'EXPIRADO', ultimoErro: 'Prazo de entrega expirado.' }, {
        where: { estado: 'PENDENTE', expiraEm: { [Op.lt]: new Date() } }
      });
      for (let indice = 0; indice < TAMANHO_LOTE; indice += 1) {
        const envio = await reclamarProximoEnvio();
        if (!envio) break;
        await this._entregar(envio);
        if (indice < TAMANHO_LOTE - 1) await esperar(INTERVALO_ENTRE_ENVIOS_MS);
      }
    } finally { this.aProcessar = false; }
    const pendentes = await EnvioWhatsapp.count({ where: { estado: 'PENDENTE', proximaTentativaEm: { [Op.lte]: new Date() } } });
    if (pendentes) this.acordar();
  }

  async _entregar(envio) {
    try {
      const resultado = await servicoWhatsApp.enviarTexto({ telefone: envio.telefone, mensagem: envio.mensagem });
      await envio.update({ estado: 'ENVIADO', enviadoEm: new Date(), ultimoErro: null, identificadorFornecedor: resultado.identificador });
    } catch (erro) {
      const tentativas = envio.tentativas + 1;
      const expirou = envio.expiraEm && new Date(envio.expiraEm) <= new Date();
      const terminal = tentativas >= envio.maxTentativas || expirou;
      await envio.update({
        estado: expirou ? 'EXPIRADO' : terminal ? 'FALHADO' : 'PENDENTE', tentativas,
        ultimoErro: String(erro.message || 'Falha desconhecida').slice(0, 500),
        proximaTentativaEm: new Date(Date.now() + calcularAtrasoRepeticao(tentativas))
      });
    }
  }
}

async function reclamarProximoEnvio() {
  return sequelize.transaction(async (transaction) => {
    const envio = await EnvioWhatsapp.findOne({
      where: {
        estado: 'PENDENTE', proximaTentativaEm: { [Op.lte]: new Date() },
        [Op.or]: [{ expiraEm: null }, { expiraEm: { [Op.gt]: new Date() } }]
      },
      order: [['prioridade', 'DESC'], ['id', 'ASC']], transaction,
      lock: transaction.LOCK.UPDATE, skipLocked: true
    });
    if (!envio) return null;
    await envio.update({ estado: 'PROCESSANDO' }, { transaction });
    return envio;
  });
}

export function calcularAtrasoRepeticao(tentativa) {
  const base = Math.min(5_000 * (2 ** Math.max(0, tentativa - 1)), 15 * 60_000);
  return base + Math.floor(Math.random() * 1000);
}
function esperar(ms) { return new Promise((resolver) => setTimeout(resolver, ms)); }
function mascararTelefone(telefone) { const valor = String(telefone || ''); return valor.length > 4 ? `${valor.slice(0, 6)}***${valor.slice(-3)}` : '***'; }
function erroHttp(mensagem, statusCode) { const erro = new Error(mensagem); erro.statusCode = statusCode; throw erro; }

async function limparHistoricoAntigo() {
  // Conserva apenas o período necessário para consulta operacional e evita crescimento ilimitado da fila.
  const diasConfigurados = Number(process.env.WHATSAPP_RETENCAO_DIAS || 90);
  const dias = Number.isFinite(diasConfigurados) && diasConfigurados >= 7 ? diasConfigurados : 90;
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  await EnvioWhatsapp.destroy({
    where: {
      estado: { [Op.in]: ['ENVIADO', 'FALHADO', 'EXPIRADO'] },
      actualizado_em: { [Op.lt]: limite }
    }
  });
}

export const processadorFilaWhatsapp = new ProcessadorFilaWhatsapp();
