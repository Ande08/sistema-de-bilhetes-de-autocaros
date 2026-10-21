import test from 'node:test';
import assert from 'node:assert/strict';
import { Assento, Bilhete, Bus, EnvioWhatsapp, MensagemSuporte, Pagamento, Route, TicketSuporte, Trip, User } from '../src/models/index.js';

test('modelos usam os mesmos nomes de colunas das migrations', () => {
  const casos = [
    [User, 'palavraPasseHash', 'password_hash'],
    [User, 'telefone', 'telefone'],
    [User, 'apelido', 'apelido'],
    [Bus, 'registration', 'matricula'],
    [Route, 'origin', 'origem'],
    [Trip, 'routeId', 'rota_id'],
    [Trip, 'busId', 'autocarro_id'],
    [Trip, 'departureAt', 'partida_em'],
    [Trip, 'price', 'preco'],
    [Assento, 'autocarroId', 'autocarro_id'],
    [Bilhete, 'utilizadorId', 'utilizador_id'],
    [Pagamento, 'bilheteId', 'bilhete_id'],
    [TicketSuporte, 'gestorId', 'gestor_id'],
    [MensagemSuporte, 'ticketId', 'ticket_id'],
    [EnvioWhatsapp, 'chaveIdempotencia', 'chave_idempotencia'],
    [EnvioWhatsapp, 'proximaTentativaEm', 'proxima_tentativa_em']
  ];
  for (const [Modelo, atributo, coluna] of casos) {
    assert.equal(Modelo.getAttributes()[atributo].field, coluna, `${Modelo.name}.${atributo}`);
  }
});

test('timestamps globais apontam para as colunas em português', () => {
  assert.equal(User.getAttributes().criado_em.field, 'criado_em');
  assert.equal(User.getAttributes().actualizado_em.field, 'actualizado_em');
});
