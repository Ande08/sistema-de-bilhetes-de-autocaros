import { sequelize } from './database.js';
import '../models/index.js';

export async function verificarLigacaoBaseDados() {
  await sequelize.authenticate();
  console.log('Ligação à base de dados estabelecida com sucesso.');
}
