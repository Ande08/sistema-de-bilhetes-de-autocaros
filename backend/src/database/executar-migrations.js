import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DataTypes, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { validarVariaveisAmbiente } from '../config/validar-ambiente.js';

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
const directorioMigrations = path.join(directorioActual, 'migrations');

async function executar() {
  validarVariaveisAmbiente();
  await sequelize.authenticate();
  await sequelize.query(`CREATE TABLE IF NOT EXISTS migrations_sistema (
    nome VARCHAR(180) PRIMARY KEY,
    executada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const aplicadas = await sequelize.query('SELECT nome FROM migrations_sistema', { type: QueryTypes.SELECT });
  const nomesAplicados = new Set(aplicadas.map(({ nome }) => nome));
  const ficheiros = (await readdir(directorioMigrations)).filter((nome) => nome.endsWith('.js')).sort();

  for (const ficheiro of ficheiros) {
    if (nomesAplicados.has(ficheiro)) continue;
    const migration = await import(pathToFileURL(path.join(directorioMigrations, ficheiro)));
    await sequelize.transaction(async (transaction) => {
      await migration.up(sequelize.getQueryInterface(), DataTypes, transaction);
      await sequelize.query('INSERT INTO migrations_sistema (nome) VALUES (?)', { replacements: [ficheiro], transaction });
    });
    console.log(`Migration aplicada: ${ficheiro}`);
  }

  console.log('Base de dados atualizada.');
}

executar().catch((erro) => {
  console.error('Falha ao executar migrations:', erro.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
