import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve o .env a partir deste ficheiro, e não da pasta actual do terminal.
// Desta forma, o backend pode ser iniciado tanto em backend/ como em backend/src/.
export const caminhoFicheiroAmbiente = fileURLToPath(new URL('../../.env', import.meta.url));

config({ path: caminhoFicheiroAmbiente });
