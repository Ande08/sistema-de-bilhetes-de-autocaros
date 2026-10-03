import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('todas as migrations possuem métodos up e down', async () => {
  const directorio = path.resolve('src/database/migrations');
  const ficheiros = (await readdir(directorio)).filter((nome) => nome.endsWith('.js')).sort();
  assert.ok(ficheiros.length >= 3);

  for (const ficheiro of ficheiros) {
    const migration = await import(pathToFileURL(path.join(directorio, ficheiro)));
    assert.equal(typeof migration.up, 'function', `${ficheiro} deve exportar up`);
    assert.equal(typeof migration.down, 'function', `${ficheiro} deve exportar down`);
  }
});

test('nomes das migrations são versionados e únicos', async () => {
  const ficheiros = (await readdir(path.resolve('src/database/migrations'))).filter((nome) => nome.endsWith('.js'));
  assert.equal(new Set(ficheiros).size, ficheiros.length);
  ficheiros.forEach((nome) => assert.match(nome, /^\d{3}-[a-z-]+\.js$/));
});
