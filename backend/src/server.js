import './config/carregar-ambiente.js';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { verificarLigacaoBaseDados } from './config/inicializar-base-dados.js';
import { validarVariaveisAmbiente } from './config/validar-ambiente.js';
import { configurarSuporteEmTempoReal } from './realtime/suporte.socket.js';
import { garantirInstanciaWhatsappPm2 } from './integrations/whatsapp/pm2-whatsapp.service.js';
import { sequelize } from './config/database.js';

const port = Number(process.env.PORT) || 3000;

validarVariaveisAmbiente();
const servidorHttp = createServer(app);
const io = new Server(servidorHttp, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });
app.set('io', io);
configurarSuporteEmTempoReal(io);

let encerramentoEmCurso = false;

/**
 * Para novas ligações HTTP/Socket.IO e fecha o pool Sequelize. O PM2 envia
 * SIGTERM nos reinícios; assim as ligações MySQL e as caches de prepared
 * statements são libertadas antes do processo terminar.
 */
async function encerrar(sinal, codigo = 0) {
  if (encerramentoEmCurso) return;
  encerramentoEmCurso = true;
  console.log(`A encerrar a API por ${sinal}...`);
  try {
    io.close();
    if (servidorHttp.listening) servidorHttp.close();
    await sequelize.close();
  } catch (erro) {
    console.error('Falha durante o encerramento da API:', erro.message);
    codigo = 1;
  } finally {
    process.exit(codigo);
  }
}

process.once('SIGTERM', () => encerrar('SIGTERM'));
process.once('SIGINT', () => encerrar('SIGINT'));

// A API só fica disponível depois de confirmar o acesso à base de dados.
verificarLigacaoBaseDados()
  .then(() => {
    servidorHttp.listen(port, () => {
      console.log(`API executando em http://localhost:${port}`);
      const iniciarWhatsApp = process.env.WHATSAPP_INICIAR_AUTOMATICAMENTE === 'true'
        || process.env.OTP_FORNECEDOR === 'WHATSAPP_BAILEYS';
      if (iniciarWhatsApp) {
        garantirInstanciaWhatsappPm2().catch((erro) => console.error('Não foi possível iniciar o WhatsApp no PM2:', erro.message));
      }
    });
  })
  .catch(async (erro) => {
    console.error('Não foi possível ligar à base de dados:', erro.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
