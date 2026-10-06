import bcrypt from 'bcryptjs';
import {
  Assento,
  Auditoria,
  Bilhete,
  Bus,
  MensagemSuporte,
  Notificacao,
  Pagamento,
  Reserva,
  Route,
  TicketSuporte,
  Trip,
  User
} from '../../models/index.js';

// Esta carga cria cenários previsíveis para demonstrações e testes manuais locais.
// Ela só é executada quando CRIAR_DADOS_DEMO=true, evitando dados fictícios em produção.
export async function executar({ transaction }) {
  if (process.env.CRIAR_DADOS_DEMO !== 'true') return;

  // Actualiza também utilizadores existentes para manter as credenciais de teste documentadas.
  async function garantirUtilizador({ nome, apelido, telefone, palavraPasse, perfil, activo = true }) {
    const palavraPasseHash = await bcrypt.hash(palavraPasse, 12);
    const [utilizador, criado] = await User.findOrCreate({
      where: { telefone },
      defaults: { nome, apelido, telefone, palavraPasseHash, perfil, activo },
      transaction
    });

    if (!criado) {
      await utilizador.update({ nome, apelido, palavraPasseHash, perfil, activo }, { transaction });
    }
    return utilizador;
  }

  async function garantirAutocarro({ registration, model, capacity }) {
    const [autocarro] = await Bus.findOrCreate({
      where: { registration },
      defaults: { model, capacity, active: true },
      transaction
    });
    await autocarro.update({ model, capacity, active: true }, { transaction });

    // Cada autocarro recebe a sua lotação completa de assentos numerados.
    await Assento.bulkCreate(
      Array.from({ length: capacity }, (_, indice) => ({
        autocarroId: autocarro.id,
        numero: String(indice + 1)
      })),
      { ignoreDuplicates: true, transaction }
    );
    return autocarro;
  }

  async function garantirRota({ origin, destination, distanceKm }) {
    const [rota] = await Route.findOrCreate({
      where: { origin, destination },
      defaults: { distanceKm, active: true },
      transaction
    });
    await rota.update({ distanceKm, active: true }, { transaction });
    return rota;
  }

  function dataRelativa(dias, hora, minutos = 0) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    data.setHours(hora, minutos, 0, 0);
    return data;
  }

  async function garantirViagem({ rota, autocarro, dias, hora, duracaoHoras, price, status = 'AGENDADA' }) {
    const departureAt = dataRelativa(dias, hora);
    const arrivalExpectedAt = new Date(departureAt.getTime() + duracaoHoras * 60 * 60 * 1000);
    const [viagem] = await Trip.findOrCreate({
      where: { routeId: rota.id, busId: autocarro.id, departureAt },
      defaults: { arrivalExpectedAt, price, status },
      transaction
    });
    return viagem;
  }

  async function garantirMensagem(ticket, { remetenteId = null, autorTipo, conteudo, lidaEm = null }) {
    const [mensagem] = await MensagemSuporte.findOrCreate({
      where: { ticketId: ticket.id, autorTipo, conteudo },
      defaults: { remetenteId, lidaEm },
      transaction
    });
    return mensagem;
  }

  const administrador = await garantirUtilizador({
    nome: 'Administrador', apelido: 'de Testes', telefone: '+258840000009',
    palavraPasse: 'Administrador@123', perfil: 'ADMIN'
  });
  const gestor = await garantirUtilizador({
    nome: 'Gestor', apelido: 'de Suporte', telefone: '+258840000010',
    palavraPasse: 'Suporte@123', perfil: 'GESTOR_SUPORTE'
  });
  const passageiroPrincipal = await garantirUtilizador({
    nome: 'Passageiro', apelido: 'de Testes', telefone: '+258840000002',
    palavraPasse: 'Passageiro@123', perfil: 'PASSAGEIRO'
  });
  const passageiroSecundario = await garantirUtilizador({
    nome: 'Amélia', apelido: 'Mabunda', telefone: '+258840000003',
    palavraPasse: 'Passageiro@123', perfil: 'PASSAGEIRO'
  });
  await garantirUtilizador({
    nome: 'Conta', apelido: 'Inactiva', telefone: '+258840000004',
    palavraPasse: 'Passageiro@123', perfil: 'PASSAGEIRO', activo: false
  });

  const autocarroMaputo = await garantirAutocarro({ registration: 'TESTE-MP-01', model: 'Yutong ZK6122', capacity: 40 });
  const autocarroBeira = await garantirAutocarro({ registration: 'TESTE-BR-02', model: 'Marcopolo Paradiso', capacity: 36 });
  const autocarroNampula = await garantirAutocarro({ registration: 'TESTE-NP-03', model: 'Volvo B11R', capacity: 44 });

  const rotaMaputoBeira = await garantirRota({ origin: 'Maputo', destination: 'Beira', distanceKm: 1190 });
  const rotaBeiraNampula = await garantirRota({ origin: 'Beira', destination: 'Nampula', distanceKm: 940 });
  const rotaMaputoXaiXai = await garantirRota({ origin: 'Maputo', destination: 'Xai-Xai', distanceKm: 220 });

  const viagemMaputoBeira = await garantirViagem({ rota: rotaMaputoBeira, autocarro: autocarroMaputo, dias: 7, hora: 6, duracaoHoras: 15, price: 1800 });
  const viagemBeiraNampula = await garantirViagem({ rota: rotaBeiraNampula, autocarro: autocarroBeira, dias: 14, hora: 7, duracaoHoras: 12, price: 1450 });
  const viagemMaputoXaiXai = await garantirViagem({ rota: rotaMaputoXaiXai, autocarro: autocarroNampula, dias: 3, hora: 9, duracaoHoras: 4, price: 550 });
  await garantirViagem({ rota: rotaMaputoBeira, autocarro: autocarroNampula, dias: 21, hora: 18, duracaoHoras: 15, price: 1750, status: 'CANCELADA' });

  const assentosMaputo = await Assento.findAll({ where: { autocarroId: autocarroMaputo.id }, order: [['numero', 'ASC']], transaction });
  const assentosBeira = await Assento.findAll({ where: { autocarroId: autocarroBeira.id }, order: [['numero', 'ASC']], transaction });

  const [bilheteEmitido] = await Bilhete.findOrCreate({
    where: { codigo: 'BIL-LOCAL-001' },
    defaults: {
      utilizadorId: passageiroPrincipal.id, viagemId: viagemMaputoBeira.id,
      assentoId: assentosMaputo[0].id, nomePassageiro: 'Passageiro de Testes',
      preco: viagemMaputoBeira.price, estado: 'EMITIDO'
    },
    transaction
  });
  await Pagamento.findOrCreate({
    where: { referencia: 'PAG-LOCAL-001' },
    defaults: { bilheteId: bilheteEmitido.id, metodo: 'MPESA', valor: viagemMaputoBeira.price, estado: 'APROVADO' },
    transaction
  });

  const [bilheteCancelado] = await Bilhete.findOrCreate({
    where: { codigo: 'BIL-LOCAL-002' },
    defaults: {
      utilizadorId: passageiroSecundario.id, viagemId: viagemBeiraNampula.id,
      assentoId: assentosBeira[0].id, nomePassageiro: 'Amélia Mabunda',
      preco: viagemBeiraNampula.price, estado: 'CANCELADO'
    },
    transaction
  });
  await Pagamento.findOrCreate({
    where: { referencia: 'PAG-LOCAL-002' },
    defaults: { bilheteId: bilheteCancelado.id, metodo: 'EMOLA', valor: viagemBeiraNampula.price, estado: 'REEMBOLSADO' },
    transaction
  });

  await Reserva.findOrCreate({
    where: { utilizadorId: passageiroPrincipal.id, viagemId: viagemMaputoBeira.id, assentoId: assentosMaputo[1].id },
    defaults: { estado: 'PENDENTE', expiraEm: new Date(Date.now() + 30 * 60 * 1000) },
    transaction
  });
  await Reserva.findOrCreate({
    where: { utilizadorId: passageiroSecundario.id, viagemId: viagemBeiraNampula.id, assentoId: assentosBeira[1].id },
    defaults: { estado: 'EXPIRADA', expiraEm: new Date(Date.now() - 60 * 60 * 1000) },
    transaction
  });

  const notificacoes = [
    { utilizadorId: passageiroPrincipal.id, titulo: 'Bilhete de teste emitido', mensagem: 'A sua viagem Maputo–Beira está confirmada.', tipo: 'BILHETE', lidaEm: null },
    { utilizadorId: passageiroPrincipal.id, titulo: 'Lembrete de viagem', mensagem: 'Consulte o horário e apresente-se com antecedência.', tipo: 'VIAGEM', lidaEm: new Date() },
    { utilizadorId: passageiroSecundario.id, titulo: 'Reembolso simulado', mensagem: 'O pagamento do bilhete cancelado foi marcado como reembolsado.', tipo: 'PAGAMENTO', lidaEm: null }
  ];
  for (const notificacao of notificacoes) {
    await Notificacao.findOrCreate({
      where: { utilizadorId: notificacao.utilizadorId, titulo: notificacao.titulo },
      defaults: notificacao,
      transaction
    });
  }

  const [ticketAberto] = await TicketSuporte.findOrCreate({
    where: { codigo: 'SUP-LOCAL-001' },
    defaults: {
      utilizadorId: passageiroPrincipal.id, assunto: 'Dúvida sobre bagagem',
      categoria: 'VIAGEM', prioridade: 'NORMAL', estado: 'ABERTO'
    },
    transaction
  });
  await garantirMensagem(ticketAberto, { remetenteId: passageiroPrincipal.id, autorTipo: 'PASSAGEIRO', conteudo: 'Qual é o limite de bagagem permitido na viagem?' });
  await garantirMensagem(ticketAberto, { autorTipo: 'IA', conteudo: 'Um gestor poderá confirmar as regras de bagagem aplicáveis à sua rota.' });

  const [ticketAtendimento] = await TicketSuporte.findOrCreate({
    where: { codigo: 'SUP-LOCAL-002' },
    defaults: {
      utilizadorId: passageiroSecundario.id, gestorId: gestor.id, assunto: 'Pagamento ainda não actualizado',
      categoria: 'PAGAMENTO', prioridade: 'ALTA', estado: 'EM_ATENDIMENTO'
    },
    transaction
  });
  await garantirMensagem(ticketAtendimento, { remetenteId: passageiroSecundario.id, autorTipo: 'PASSAGEIRO', conteudo: 'Fiz o pagamento, mas o estado ainda aparece pendente.' });
  await garantirMensagem(ticketAtendimento, { remetenteId: gestor.id, autorTipo: 'GESTOR_SUPORTE', conteudo: 'Estou a verificar a referência do pagamento. Responderemos em breve.', lidaEm: new Date() });

  const [ticketResolvido] = await TicketSuporte.findOrCreate({
    where: { codigo: 'SUP-LOCAL-003' },
    defaults: {
      utilizadorId: passageiroPrincipal.id, gestorId: gestor.id, assunto: 'Correcção do nome da conta',
      categoria: 'CONTA', prioridade: 'BAIXA', estado: 'RESOLVIDO', resolvidoEm: new Date()
    },
    transaction
  });
  await garantirMensagem(ticketResolvido, { remetenteId: gestor.id, autorTipo: 'GESTOR_SUPORTE', conteudo: 'Os dados da conta foram verificados e a solicitação foi resolvida.', lidaEm: new Date() });

  const auditorias = [
    { utilizadorId: administrador.id, operacao: 'CRIAR_DADOS_LOCAIS', entidade: 'sistema', entidadeId: 'DEMO-LOCAL', valoresNovos: { contas: 5, autocarros: 3, rotas: 3 }, enderecoIp: '127.0.0.1' },
    { utilizadorId: gestor.id, operacao: 'ATRIBUIR_TICKET', entidade: 'ticket_suporte', entidadeId: 'SUP-LOCAL-002', valoresNovos: { gestorId: gestor.id, estado: 'EM_ATENDIMENTO' }, enderecoIp: '127.0.0.1' },
    { utilizadorId: passageiroPrincipal.id, operacao: 'COMPRAR_BILHETE', entidade: 'bilhete', entidadeId: 'BIL-LOCAL-001', valoresNovos: { viagemId: viagemMaputoBeira.id, estado: 'EMITIDO' }, enderecoIp: '127.0.0.1' }
  ];
  for (const auditoria of auditorias) {
    await Auditoria.findOrCreate({
      where: { operacao: auditoria.operacao, entidade: auditoria.entidade, entidadeId: auditoria.entidadeId },
      defaults: auditoria,
      transaction
    });
  }

  // A terceira viagem fica sem bilhetes para testar uma compra nova com todos os assentos livres.
  void viagemMaputoXaiXai;
}
