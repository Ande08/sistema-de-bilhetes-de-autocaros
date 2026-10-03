import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { verificarLigacaoBaseDados } from './config/inicializar-base-dados.js';
import { validarVariaveisAmbiente } from './config/validar-ambiente.js';
import { configurarSuporteEmTempoReal } from './realtime/suporte.socket.js';

const port = Number(process.env.PORT) || 3000;

validarVariaveisAmbiente();
const servidorHttp = createServer(app);
const io = new Server(servidorHttp, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });
app.set('io', io);
configurarSuporteEmTempoReal(io);

// A API só fica disponível depois de confirmar o acesso à base de dados.
verificarLigacaoBaseDados()
  .then(() => {
    servidorHttp.listen(port, () => {
      console.log(`API executando em http://localhost:${port}`);
    });
  })
  .catch((erro) => {
    console.error('Não foi possível ligar à base de dados:', erro.message);
    process.exit(1);
  });
