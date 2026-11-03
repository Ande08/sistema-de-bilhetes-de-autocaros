import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarPrioridadeTicket, garantirAcesso, responderAssistente } from '../src/services/suporte.service.js';

test('assistente responde às perguntas frequentes de bilhetes', () => {
  const resposta = responderAssistente('Como posso imprimir o meu bilhete?');
  assert.equal(resposta.resolveuAutomaticamente, true);
  assert.match(resposta.mensagem, /bilhete eletrónico/i);
});

test('assistente encaminha questões desconhecidas ao suporte humano', () => {
  const resposta = responderAssistente('Tenho uma situação muito específica');
  assert.equal(resposta.resolveuAutomaticamente, false);
  assert.match(resposta.mensagem, /atendimento humano/i);
});

test('isola tickets por passageiro e por gestor atribuído', () => {
  const ticket = { utilizadorId: 10, gestorId: 20 };
  assert.doesNotThrow(() => garantirAcesso(ticket, { id: 10, perfil: 'PASSAGEIRO' }));
  assert.doesNotThrow(() => garantirAcesso(ticket, { id: 20, perfil: 'GESTOR_SUPORTE' }));
  assert.throws(() => garantirAcesso(ticket, { id: 99, perfil: 'ADMIN' }), /acesso/i);
  assert.throws(() => garantirAcesso(ticket, { id: 11, perfil: 'PASSAGEIRO' }), /acesso/i);
  assert.throws(() => garantirAcesso(ticket, { id: 21, perfil: 'GESTOR_SUPORTE' }), /acesso/i);
});

test('classifica automaticamente a prioridade sem aceitar decisão do cliente', () => {
  const urgente = classificarPrioridadeTicket({
    assunto: 'Pagamento duplicado', categoria: 'PAGAMENTO',
    mensagem: 'O dinheiro foi cobrado e estou sem bilhete, a partida é urgente.',
    partidaEm: '2026-11-03T18:00:00.000Z'
  }, new Date('2026-11-03T10:00:00.000Z'));
  assert.equal(urgente.prioridade, 'URGENTE');
  assert.ok(urgente.pontuacao >= 85);
  assert.match(urgente.motivo, /financeiro|partida/i);
});
