import 'dotenv/config';
import app from './app.js';
import { verificarLigacaoBaseDados } from './config/inicializar-base-dados.js';
import { validarVariaveisAmbiente } from './config/validar-ambiente.js';

const port = Number(process.env.PORT) || 3000;

validarVariaveisAmbiente();

// A API só fica disponível depois de confirmar o acesso à base de dados.
verificarLigacaoBaseDados()
  .then(() => {
    app.listen(port, () => {
      console.log(`API executando em http://localhost:${port}`);
    });
  })
  .catch((erro) => {
    console.error('Não foi possível ligar à base de dados:', erro.message);
    process.exit(1);
  });
