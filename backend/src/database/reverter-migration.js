import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DataTypes, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { validarVariaveisAmbiente } from '../config/validar-ambiente.js';

const directorioActual = path.dirname(fileURLToPath(import.meta.url));

async function reverter() {
  validarVariaveisAmbiente();
  await sequelize.authenticate();
  const [ultima] = await sequelize.query('SELECT nome FROM migrations_sistema ORDER BY executada_em DESC LIMIT 1', { type: QueryTypes.SELECT });
  if (!ultima) return console.log('Não existem migrations para reverter.');

  const migration = await import(pathToFileURL(path.join(directorioActual, 'migrations', ultima.nome)));
  await sequelize.transaction(async (transaction) => {
    await migration.down(sequelize.getQueryInterface(), DataTypes, transaction);
    await sequelize.query('DELETE FROM migrations_sistema WHERE nome = ?', { replacements: [ultima.nome], transaction });
  });
  console.log(`Migration revertida: ${ultima.nome}`);
}

reverter().catch((erro) => {
  console.error('Falha ao reverter migration:', erro.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
