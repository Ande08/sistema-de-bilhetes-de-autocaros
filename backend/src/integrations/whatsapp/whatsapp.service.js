import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

const raizBackend = fileURLToPath(new URL('../../../', import.meta.url));
const raizDadosPadrao = path.join(raizBackend, '.dados');
const pastaPadrao = path.join(raizDadosPadrao, 'whatsapp');

class ServicoWhatsApp {
  constructor() {
    this.socket = null;
    this.estado = 'NAO_INICIADO';
    this.numero = null;
    this.qrCodeDataUrl = null;
    this.ultimaAlteracao = new Date();
    this.tentativasReconexao = 0;
    this.temporizadorReconexao = null;
    this.aIniciar = null;
    this.reinicioManual = false;
    this.ouvintesEstado = new Set();
  }

  get pastaSessao() {
    const configurada = process.env.WHATSAPP_SESSION_PATH;
    return configurada ? (path.isAbsolute(configurada) ? configurada : path.resolve(raizBackend, configurada)) : pastaPadrao;
  }

  async iniciar() {
    if (this.aIniciar) return this.aIniciar;
    if (this.estado === 'LIGADO' && this.socket) return this.obterEstado();
    if (this.socket && ['A_LIGAR', 'AGUARDA_QR', 'A_RECONECTAR'].includes(this.estado)) return this.obterEstado();
    this.aIniciar = this._estabelecerLigacao().finally(() => { this.aIniciar = null; });
    return this.aIniciar;
  }

  async _estabelecerLigacao() {
    this._actualizarEstado('A_LIGAR');
    const { state, saveCreds } = await useMultiFileAuthState(this.pastaSessao);
    const { version } = await fetchLatestBaileysVersion();
    const socket = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' }),
      printQRInTerminal: false,
      browser: [process.env.WHATSAPP_NOME_DISPOSITIVO || 'Viagem Bus Avisos', 'Chrome', '1.0.0'],
      keepAliveIntervalMs: 30_000,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000
    });
    this.socket = socket;
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (actualizacao) => this._tratarActualizacao(actualizacao, socket).catch((erro) => {
      console.error('Falha ao processar o estado do WhatsApp:', erro.message);
      this._actualizarEstado('ERRO_RECONEXAO');
    }));
    return this.obterEstado();
  }

  async _tratarActualizacao({ connection, lastDisconnect, qr }, socketDaLigacao) {
    if (socketDaLigacao !== this.socket) return;
    if (qr) {
      this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      this._actualizarEstado('AGUARDA_QR');
      if (process.env.WHATSAPP_MOSTRAR_QR_TERMINAL !== 'false') qrcodeTerminal.generate(qr, { small: true });
    }
    if (connection === 'open') {
      this.numero = this.socket?.user?.id?.split(':')[0]?.split('@')[0] || null;
      this.qrCodeDataUrl = null;
      this.tentativasReconexao = 0;
      this._actualizarEstado('LIGADO');
      console.log('WhatsApp ligado e pronto para entregar OTPs e avisos de viagem.');
    }
    if (connection === 'close') {
      this.socket = null;
      this.numero = null;
      if (this.reinicioManual) return;
      const codigo = lastDisconnect?.error?.output?.statusCode;
      if (codigo === DisconnectReason.loggedOut) {
        this.qrCodeDataUrl = null;
        this._actualizarEstado('SESSAO_TERMINADA');
        return;
      }
      this._actualizarEstado('A_RECONECTAR');
      this._agendarReconexao();
    }
  }

  _agendarReconexao() {
    clearTimeout(this.temporizadorReconexao);
    const maximo = Number(process.env.WHATSAPP_MAX_RECONEXOES) || 10;
    if (this.tentativasReconexao >= maximo) {
      this._actualizarEstado('ERRO_RECONEXAO');
      return;
    }
    this.tentativasReconexao += 1;
    const atraso = Math.min(5000 * (2 ** (this.tentativasReconexao - 1)), 5 * 60_000) + Math.floor(Math.random() * 1000);
    this.temporizadorReconexao = setTimeout(() => {
      this.iniciar().catch((erro) => {
        console.error('Falha ao religar o WhatsApp:', erro.message);
        this._agendarReconexao();
      });
    }, atraso);
  }

  async reiniciar({ limparSessao = false } = {}) {
    this.reinicioManual = true;
    clearTimeout(this.temporizadorReconexao);
    try { this.socket?.end(new Error('Reinício solicitado pela administração.')); } catch { /* ligação já encerrada */ }
    this.socket = null;
    this.numero = null;
    this.qrCodeDataUrl = null;
    this.tentativasReconexao = 0;
    if (limparSessao) {
      const relativa = path.relative(raizDadosPadrao, this.pastaSessao);
      if (!relativa || relativa.startsWith('..') || path.isAbsolute(relativa)) {
        const erro = new Error('A sessão só pode ser renovada dentro da pasta .dados configurada para o backend.');
        erro.statusCode = 400;
        throw erro;
      }
      await rm(this.pastaSessao, { recursive: true, force: true });
    }
    this.reinicioManual = false;
    return this.iniciar();
  }

  async enviarTexto({ telefone, mensagem }) {
    if (this.estado !== 'LIGADO' || !this.socket) {
      const erro = new Error('O WhatsApp ainda não está ligado. A administração deve ler o QR Code no painel.');
      erro.statusCode = 503;
      throw erro;
    }
    const numero = String(telefone).replace(/\D/g, '');
    const resultados = await this.socket.onWhatsApp(numero);
    const destino = resultados?.find((item) => item.exists)?.jid;
    if (!destino) {
      const erro = new Error('Este número não possui uma conta WhatsApp disponível.');
      erro.statusCode = 400;
      throw erro;
    }
    const resultado = await this.socket.sendMessage(destino, { text: mensagem });
    return { fornecedor: 'WHATSAPP_BAILEYS', identificador: resultado?.key?.id || null };
  }

  obterEstado() {
    return {
      estado: this.estado,
      ligado: this.estado === 'LIGADO',
      numero: this.numero,
      qrCodeDataUrl: this.qrCodeDataUrl,
      ultimaAlteracao: this.ultimaAlteracao,
      tentativasReconexao: this.tentativasReconexao
    };
  }

  adicionarOuvinteEstado(ouvinte) {
    this.ouvintesEstado.add(ouvinte);
    return () => this.ouvintesEstado.delete(ouvinte);
  }

  _actualizarEstado(estado) {
    this.estado = estado;
    this.ultimaAlteracao = new Date();
    const actual = this.obterEstado();
    this.ouvintesEstado.forEach((ouvinte) => Promise.resolve(ouvinte(actual)).catch((erro) => console.error('Falha ao guardar estado WhatsApp:', erro.message)));
  }
}

// Instância única partilhada pelo adaptador OTP e pelo painel administrativo.
export const servicoWhatsApp = new ServicoWhatsApp();
