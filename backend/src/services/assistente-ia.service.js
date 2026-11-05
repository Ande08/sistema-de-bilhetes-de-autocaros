import { obterConfiguracaoIaInterna } from './configuracao-ia.service.js';
import { solicitarConclusaoOpenRouter } from '../integrations/openrouter/openrouter.service.js';
import { responderAssistente } from './suporte.service.js';
import { removerDadosSensiveis, responderComDadosConfirmados, respostaIaContemDadosNaoConfirmados } from './dados-assistente.service.js';

const INSTRUCOES = `És o assistente virtual da Viagem Bus, um sistema académico de bilhetes de autocarros em Moçambique.
Responde em português, de forma curta, clara e cordial. Ajuda apenas com contas, viagens, assentos, pagamentos simulados, bilhetes, cancelamentos e suporte.
Não forneças preços, horários, datas, disponibilidade, códigos, referências ou dados de contas; estes dados são tratados exclusivamente pelo backend. Nunca indiques um limite de bagagem, peso em kg ou política operacional como se fosse comum a todas as empresas: explica que varia por transportadora e orienta o cliente a abrir o perfil da empresa e enviar uma mensagem. Não peças documentos pessoais, telefone, e-mail, palavra-passe, dados de cartão ou códigos. Explica que os pagamentos são simulados.
Quando não tiveres informação suficiente, recomenda a abertura de um ticket para atendimento humano.`;

export async function responderAssistenteComIa(mensagem, utilizadorId) {
  const contingencia = responderAssistente(mensagem);
  try {
    // Informações dinâmicas e privadas nunca são delegadas ao modelo externo.
    const confirmada = await responderComDadosConfirmados(mensagem, utilizadorId);
    if (confirmada) return confirmada;
    const configuracao = await obterConfiguracaoIaInterna();
    if (!configuracao.activo || !configuracao.apiKey) return { ...contingencia, origem: 'LOCAL', modelo: null };
    // Remove dados pessoais e segredos antes de qualquer comunicação externa.
    const mensagemSegura = removerDadosSensiveis(mensagem);
    if (mensagemSegura !== mensagem) {
      return { mensagem: 'Por segurança, não envie telefone, e-mail, nome completo, documento, dados de cartão, palavra-passe, token ou chave no chat. Remova esses dados e volte a enviar a pergunta, ou abra um pedido de atendimento humano.', resolveuAutomaticamente: false, origem: 'BLOQUEADA_PRIVACIDADE', modelo: null };
    }
    const resposta = await solicitarConclusaoOpenRouter({
      apiKey: configuracao.apiKey, modelo: configuracao.modelo,
      mensagens: [{ role: 'system', content: INSTRUCOES }, { role: 'user', content: mensagemSegura }]
    });
    // Bloqueia valores, datas, contactos ou referências produzidos sem fonte confirmada.
    if (respostaIaContemDadosNaoConfirmados(resposta.conteudo)) {
      return { mensagem: 'Não consigo confirmar esses valores ou detalhes com segurança. Consulte a pesquisa de viagens ou abra um pedido de atendimento humano.', resolveuAutomaticamente: false, origem: 'BLOQUEADA', modelo: resposta.modelo };
    }
    return { mensagem: resposta.conteudo, resolveuAutomaticamente: true, origem: 'OPENROUTER', modelo: resposta.modelo };
  } catch (erro) {
    console.warn('Assistente em modo de contingência:', erro.message);
    return { ...contingencia, origem: 'LOCAL', modelo: null, contingencia: true };
  }
}
