import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarBilhetePdf } from '../src/services/bilhete-pdf.service.js';

const directorioBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = path.resolve(directorioBackend, '..', 'output', 'pdf', 'bilhete-termico-demonstracao.pdf');

const pdf = gerarBilhetePdf({
  bilhete: {
    codigo: 'BIL-DEMO-2026-001', nomePassageiro: 'Ico Tiago', preco: 1500,
    estado: 'EMITIDO', createdAt: '2026-10-27T14:30:00Z'
  },
  empresa: { nome: 'Transportes Viagem Bus' },
  rota: {
    originProvince: 'Tete', origin: 'Tete',
    destinationProvince: 'Maputo Cidade', destination: 'Maputo'
  },
  viagem: { partidaEm: '2026-10-30T05:00:00Z' },
  assento: { numero: '12', juntoJanela: true },
  pagamento: { estado: 'APROVADO' }
});

await mkdir(path.dirname(destino), { recursive: true });
await writeFile(destino, pdf);
console.log(destino);
