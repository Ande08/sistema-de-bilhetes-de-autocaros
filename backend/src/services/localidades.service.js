// Catálogo único usado pelos formulários e pela validação do backend. Assim,
// diferenças de acentuação ou digitação não criam rotas duplicadas.
export const LOCALIDADES_MOCAMBIQUE = [
  { provincia: 'Cabo Delgado', cidades: ['Pemba', 'Montepuez', 'Mocímboa da Praia', 'Mueda', 'Chiúre', 'Palma'] },
  { provincia: 'Gaza', cidades: ['Xai-Xai', 'Chókwè', 'Chibuto', 'Macia', 'Bilene', 'Manjacaze'] },
  { provincia: 'Inhambane', cidades: ['Inhambane', 'Maxixe', 'Vilankulo', 'Massinga', 'Homoíne', 'Quissico'] },
  { provincia: 'Manica', cidades: ['Chimoio', 'Manica', 'Gondola', 'Catandica', 'Sussundenga'] },
  { provincia: 'Maputo Cidade', cidades: ['Maputo'] },
  { provincia: 'Maputo Província', cidades: ['Matola', 'Boane', 'Marracuene', 'Namaacha', 'Manhiça', 'Moamba'] },
  { provincia: 'Nampula', cidades: ['Nampula', 'Nacala', 'Angoche', 'Ilha de Moçambique', 'Monapo', 'Ribáuè'] },
  { provincia: 'Niassa', cidades: ['Lichinga', 'Cuamba', 'Mandimba', 'Marrupa', 'Metangula'] },
  { provincia: 'Sofala', cidades: ['Beira', 'Dondo', 'Gorongosa', 'Marromeu', 'Nhamatanda'] },
  { provincia: 'Tete', cidades: ['Tete', 'Moatize', 'Angónia', 'Ulongué', 'Songo', 'Mutarara'] },
  { provincia: 'Zambézia', cidades: ['Quelimane', 'Mocuba', 'Gurué', 'Milange', 'Alto Molócuè', 'Maganja da Costa'] }
];

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function obterLocalidadeValida(provincia, cidade) {
  const grupo = LOCALIDADES_MOCAMBIQUE.find((item) => normalizar(item.provincia) === normalizar(provincia));
  const cidadeCanonica = grupo?.cidades.find((item) => normalizar(item) === normalizar(cidade));
  if (!grupo || !cidadeCanonica) {
    const erro = new Error('Selecione uma província e uma cidade válidas do catálogo.');
    erro.statusCode = 400;
    throw erro;
  }
  return { provincia: grupo.provincia, cidade: cidadeCanonica };
}
