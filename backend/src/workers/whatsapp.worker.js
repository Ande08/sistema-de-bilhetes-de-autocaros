import '../config/carregar-ambiente.js';
import { sequelize } from '../config/database.js';
import { verificarLigacaoBaseDados } from '../config/inicializar-base-dados.js';
import { validarVariaveisAmbiente } from '../config/validar-ambiente.js';
import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';
import { guardarEstadoWhatsapp } from '../integrations/whatsapp/whatsapp-state.store.js';
import { processadorFilaWhatsapp } from '../services/fila-whatsapp.service.js';

async function iniciarWorker() {
  validarVariaveisAmbiente();
  await verificarLigacaoBaseDados();
  servicoWhatsApp.adicionarOuvinteEstado((estado) => guardarEstadoWhatsapp(estado));
  await guardarEstadoWhatsapp(servicoWhatsApp.obterEstado());
  await processadorFilaWhatsapp.iniciar();
  await servicoWhatsApp.iniciar();
  console.log('Trabalhador WhatsApp iniciado sob gestão do PM2.');
}

async function terminar(sinal) {
  try {
    await guardarEstadoWhatsapp({ ...servicoWhatsApp.obterEstado(), estado: 'PROCESSO_PARADO', ligado: false, qrCodeDataUrl: null, sinal });
    await sequelize.close();
  } finally { process.exit(0); }
}

process.once('SIGINT', () => terminar('SIGINT'));
process.once('SIGTERM', () => terminar('SIGTERM'));

iniciarWorker().catch(async (erro) => {
  console.error('Falha ao iniciar o trabalhador WhatsApp:', erro.message);
  try { await guardarEstadoWhatsapp({ ...servicoWhatsApp.obterEstado(), estado: 'ERRO_PROCESSO', ligado: false, qrCodeDataUrl: null, erro: erro.message }); } catch { /* falha já registada no PM2 */ }
  process.exit(1);
});
