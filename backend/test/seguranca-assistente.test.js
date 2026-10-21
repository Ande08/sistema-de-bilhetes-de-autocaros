import test from 'node:test';
import assert from 'node:assert/strict';
import { identificarConsultaProtegida, removerDadosSensiveis, respostaIaContemDadosNaoConfirmados } from '../src/services/dados-assistente.service.js';

test('encaminha preços, horários e dados da conta para o backend', () => {
  assert.equal(identificarConsultaProtegida('Quanto custa viajar de Maputo para Xai-Xai?'), 'VIAGENS');
  assert.equal(identificarConsultaProtegida('Quais são os horários disponíveis?'), 'VIAGENS');
  assert.equal(identificarConsultaProtegida('Tem autocarro de Tete para Maputo?'), 'VIAGENS');
  assert.equal(identificarConsultaProtegida('Qual é o estado do meu pagamento?'), 'CONTA');
  assert.equal(identificarConsultaProtegida('Como escolho um assento?'), null);
});

test('remove informações sigilosas antes de contactar a IA externa', () => {
  const original = 'Meu telefone é +258 84 123 4567, email pessoa@exemplo.com, cvv: 123, BI: 11010001A e token=abc123.';
  const seguro = removerDadosSensiveis(original);
  assert.doesNotMatch(seguro, /841234567|pessoa@exemplo\.com|123|abc123/);
  assert.match(seguro, /TELEFONE REMOVIDO/);
  assert.match(seguro, /EMAIL REMOVIDO/);
  assert.match(seguro, /SEGREDO REMOVIDO/);
  assert.match(seguro, /DOCUMENTO REMOVIDO/);
});

test('bloqueia preços, horários, referências e contactos inventados pela IA', () => {
  assert.equal(respostaIaContemDadosNaoConfirmados('A viagem custa 750 MZN.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('O valor é 750 MTn.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('O preço é 750.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('A partida será às 08:30.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('Use o bilhete BIL-ABC-123.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('Ligue para +258841234567.'), true);
  assert.equal(respostaIaContemDadosNaoConfirmados('Pode escolher o seu assento durante a compra.'), false);
});
