import '../config/carregar-ambiente.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { validarVariaveisAmbiente } from '../config/validar-ambiente.js';

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
const directorioSeeders = path.join(directorioActual, 'seeders');

async function executar() {
  validarVariaveisAmbiente();
  await sequelize.authenticate();
  await sequelize.query(`CREATE TABLE IF NOT EXISTS seeders_sistema (
    nome VARCHAR(180) PRIMARY KEY,
    executado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const executados = await sequelize.query('SELECT nome FROM seeders_sistema', { type: QueryTypes.SELECT });
  const nomesExecutados = new Set(executados.map(({ nome }) => nome));
  const ficheiros = (await readdir(directorioSeeders)).filter((nome) => nome.endsWith('.js')).sort();

  for (const ficheiro of ficheiros) {
    if (nomesExecutados.has(ficheiro)) continue;
    const seeder = await import(pathToFileURL(path.join(directorioSeeders, ficheiro)));
    await sequelize.transaction(async (transaction) => {
      await seeder.executar({ sequelize, transaction });
      await sequelize.query('INSERT INTO seeders_sistema (nome) VALUES (?)', { replacements: [ficheiro], transaction });
    });
    console.log(`Seeder executado: ${ficheiro}`);
  }
}

executar().catch((erro) => {
  console.error('Falha ao executar seeders:', erro.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
