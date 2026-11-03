import '../config/carregar-ambiente.js';
import { sequelize } from '../config/database.js';
import { verificarLigacaoBaseDados } from '../config/inicializar-base-dados.js';
import { validarVariaveisAmbiente } from '../config/validar-ambiente.js';
import { servicoWhatsApp } from '../integrations/whatsapp/whatsapp.service.js';
import { guardarEstadoWhatsapp } from '../integrations/whatsapp/whatsapp-state.store.js';
import { processadorFilaWhatsapp } from '../services/fila-whatsapp.service.js';

let encerramentoEmCurso = false;

async function iniciarWorker() {
  validarVariaveisAmbiente();
  servicoWhatsApp.adicionarOuvinteEstado((estado) => guardarEstadoWhatsapp(estado));
  // Publica um estado válido antes de esperar pela base de dados. Assim, o painel
  // continua informativo mesmo quando o MySQL está desligado ou demora a responder.
  await guardarEstadoWhatsapp({ ...servicoWhatsApp.obterEstado(), estado: 'A_INICIAR' });
  await verificarLigacaoBaseDados();
  await processadorFilaWhatsapp.iniciar();
  await servicoWhatsApp.iniciar();
  console.log('Trabalhador WhatsApp iniciado sob gestão do PM2.');
}

async function terminar(sinal) {
  if (encerramentoEmCurso) return;
  encerramentoEmCurso = true;
  console.log(`A encerrar o trabalhador WhatsApp por ${sinal}...`);
  try {
    processadorFilaWhatsapp.parar();
    await guardarEstadoWhatsapp({ ...servicoWhatsApp.obterEstado(), estado: 'PROCESSO_PARADO', ligado: false, qrCodeDataUrl: null, sinal });
    await sequelize.close();
  } catch (erro) {
    console.error('Falha durante o encerramento do trabalhador WhatsApp:', erro.message);
  } finally { process.exit(0); }
}

process.once('SIGINT', () => terminar('SIGINT'));
process.once('SIGTERM', () => terminar('SIGTERM'));

iniciarWorker().catch(async (erro) => {
  console.error('Falha ao iniciar o trabalhador WhatsApp:', erro.message);
  try { await guardarEstadoWhatsapp({ ...servicoWhatsApp.obterEstado(), estado: 'ERRO_PROCESSO', ligado: false, qrCodeDataUrl: null, erro: erro.message }); } catch { /* falha já registada no PM2 */ }
  await sequelize.close().catch(() => {});
  process.exit(1);
});
