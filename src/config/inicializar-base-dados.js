import { sequelize } from './database.js';
import '../models/index.js';

export async function verificarLigacaoBaseDados() {
  // Apenas verifica a ligação. A estrutura é criada por schema.sql ou migrations.
  await sequelize.authenticate();
  console.log('Ligação à base de dados estabelecida com sucesso.');
}
