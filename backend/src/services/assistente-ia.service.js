import { obterConfiguracaoIaInterna } from './configuracao-ia.service.js';
import { solicitarConclusaoOpenRouter } from '../integrations/openrouter/openrouter.service.js';
import { responderAssistente } from './suporte.service.js';

const INSTRUCOES = `És o assistente virtual da Viagem Bus, um sistema académico de bilhetes de autocarros em Moçambique.
Responde em português, de forma curta, clara e cordial. Ajuda apenas com contas, viagens, assentos, pagamentos simulados, bilhetes, cancelamentos e suporte.
Não inventes dados de viagens, pagamentos ou contas. Não peças documentos pessoais. Explica que os pagamentos são simulados.
Quando não tiveres informação suficiente, recomenda a abertura de um ticket para atendimento humano.`;

export async function responderAssistenteComIa(mensagem) {
  const contingencia = responderAssistente(mensagem);
  try {
    const configuracao = await obterConfiguracaoIaInterna();
    if (!configuracao.activo || !configuracao.apiKey) return { ...contingencia, origem: 'LOCAL', modelo: null };
    const resposta = await solicitarConclusaoOpenRouter({
      apiKey: configuracao.apiKey, modelo: configuracao.modelo,
      mensagens: [{ role: 'system', content: INSTRUCOES }, { role: 'user', content: mensagem }]
    });
    return { mensagem: resposta.conteudo, resolveuAutomaticamente: true, origem: 'OPENROUTER', modelo: resposta.modelo };
  } catch (erro) {
    console.warn('Assistente em modo de contingência:', erro.message);
    return { ...contingencia, origem: 'LOCAL', modelo: null, contingencia: true };
  }
}
