import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Bilhete, Empresa, MensagemSuporte, Route, TicketSuporte, Trip, User } from '../models/index.js';

const inclusoesTicket = [
  { model: Empresa, attributes: ['id', 'nome', 'slug'] },
  { model: User, as: 'Passageiro', attributes: ['id', 'nome', 'apelido', 'telefone'] },
  { model: User, as: 'Gestor', attributes: ['id', 'nome', 'apelido', 'telefone'] },
  { model: Bilhete, attributes: ['id', 'codigo', 'estado'], include: [{ model: Trip, attributes: ['id', 'departureAt'], include: [{ model: Route, attributes: ['origin', 'destination'] }] }] }
];

const respostasFrequentes = [
  { termos: ['bagagem', 'mala', 'quilos', 'kg'], resposta: 'O limite e as condições de bagagem variam conforme a empresa. Abra o perfil da transportadora e envie uma mensagem para confirmar a política antes da viagem.' },
  { termos: ['cancelar', 'cancelamento', 'reembolso'], resposta: 'Pode cancelar um bilhete emitido antes da partida em “Meus bilhetes”. Quando aplicável, o pagamento fica marcado para reembolso.' },
  { termos: ['pagamento', 'mpesa', 'm-pesa', 'emola', 'e-mola', 'cartao'], resposta: 'Nesta versão, os pagamentos por M-Pesa, e-Mola e cartão são simulados e confirmados automaticamente. A referência fica disponível no histórico de pagamentos.' },
  { termos: ['assento', 'lugar'], resposta: 'O assento é escolhido durante a compra. Os lugares ocupados aparecem bloqueados e não podem ser selecionados.' },
  { termos: ['bilhete', 'imprimir', 'codigo'], resposta: 'Depois da compra, o bilhete eletrónico aparece em “Bilhetes”. Pode abri-lo, consultar o código e imprimir uma cópia.' },
  { termos: ['horario', 'atraso', 'partida', 'chegada'], resposta: 'O horário de partida e a previsão de chegada aparecem no bilhete e em “Minhas viagens”. Se houver uma alteração operacional, a equipa de suporte poderá confirmar os detalhes.' },
  { termos: ['documento', 'identidade', 'bi'], resposta: 'Não é necessário enviar documento pessoal para criar conta ou comprar um bilhete neste sistema.' },
  { termos: ['senha', 'palavra-passe', 'conta', 'telefone'], resposta: 'Pode atualizar o nome, apelido e palavra-passe na página “Perfil”. Se perdeu o acesso ao número associado à conta, peça atendimento humano.' }
];

function textoNormalizado(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// A primeira triagem é determinística e pode ser substituída por um adaptador de IA externo.
export function responderAssistente(mensagem) {
  const texto = textoNormalizado(mensagem);
  const encontrada = respostasFrequentes.find(({ termos }) => termos.some((termo) => texto.includes(textoNormalizado(termo))));
  if (encontrada) return { mensagem: encontrada.resposta, resolveuAutomaticamente: true };
  return {
    mensagem: 'Ainda não tenho uma resposta segura para essa questão. Pode solicitar atendimento humano e a conversa será encaminhada para a equipa de suporte.',
    resolveuAutomaticamente: false
  };
}

export async function criarTicket(utilizador, { bilheteId, codigoBilhete, assunto, categoria = 'OUTRO', mensagem }, anexo = {}) {
  if (utilizador.perfil !== 'PASSAGEIRO') throw erroAcesso('Apenas passageiros podem abrir pedidos de suporte.');
  validarConteudoTicket({ assunto, categoria, mensagem });
  const whereBilhete = bilheteId ? { id: bilheteId } : { codigo: String(codigoBilhete || '').trim().toUpperCase() };
  const bilhete = await Bilhete.findOne({
    where: { ...whereBilhete, utilizadorId: utilizador.id },
    include: [{ model: Trip, required: true, include: [{ model: Empresa, where: { activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null }, required: true }] }]
  });
  if (!bilhete) throw erroValidacao('Selecione um bilhete válido da sua conta.');
  const triagem = classificarPrioridadeTicket({ assunto, categoria, mensagem, partidaEm: bilhete.Trip.departureAt });

  return guardarNovoTicket({ utilizador, empresaId: bilhete.Trip.empresaId, bilheteId: bilhete.id, assunto, categoria, mensagem, triagem, anexo });
}

// Permite esclarecer políticas e outras dúvidas antes da compra. A empresa é
// validada no servidor e o pedido entra na mesma fila rastreável do suporte.
export async function criarContactoEmpresa(utilizador, { empresaId, assunto, categoria = 'OUTRO', mensagem }) {
  if (utilizador.perfil !== 'PASSAGEIRO') throw erroAcesso('Apenas passageiros podem contactar empresas.');
  validarConteudoTicket({ assunto, categoria, mensagem });
  const empresa = await Empresa.findOne({
    where: { id: empresaId, activa: true, estadoCadastro: 'APROVADA', eliminadaEm: null },
    attributes: ['id']
  });
  if (!empresa) throw erroValidacao('Selecione uma empresa ativa e disponível na plataforma.');
  const triagem = classificarPrioridadeTicket({ assunto, categoria, mensagem });
  return guardarNovoTicket({ utilizador, empresaId: empresa.id, bilheteId: null, assunto, categoria, mensagem, triagem });
}

function validarConteudoTicket({ assunto, categoria, mensagem }) {
  if (!assunto?.trim() || assunto.trim().length < 5 || assunto.trim().length > 160 || !mensagem?.trim() || mensagem.trim().length > 4000) {
    throw erroValidacao('Informe um assunto entre 5 e 160 caracteres e uma mensagem de até 4000 caracteres.');
  }
  const categorias = ['BILHETE', 'PAGAMENTO', 'VIAGEM', 'CONTA', 'RECLAMACAO', 'OUTRO'];
  if (!categorias.includes(categoria)) throw erroValidacao('Categoria inválida.');
}

function guardarNovoTicket({ utilizador, empresaId, bilheteId, assunto, categoria, mensagem, triagem, anexo = {} }) {
  return sequelize.transaction(async (transaction) => {
    const ticket = await TicketSuporte.create({
      codigo: `SUP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`,
      empresaId, bilheteId, utilizadorId: utilizador.id,
      assunto: assunto.trim(), categoria, prioridade: triagem.prioridade,
      prioridadePontuacao: triagem.pontuacao, prioridadeMotivo: triagem.motivo
    }, { transaction });
    await MensagemSuporte.create({
      ticketId: ticket.id, remetenteId: utilizador.id, autorTipo: 'PASSAGEIRO',
      conteudo: mensagem.trim(), imagemUrl: anexo.imagemUrl || null, imagemNome: anexo.imagemNome || null
    }, { transaction });
    return obterTicketPorId(ticket.id, utilizador, transaction);
  });
}

export async function pesquisarBilhetesParaSuporte(utilizador, termo = '') {
  if (utilizador.perfil !== 'PASSAGEIRO') throw erroAcesso('A pesquisa de bilhetes pertence ao cliente.');
  const codigo = String(termo || '').trim().toUpperCase();
  const where = { utilizadorId: utilizador.id };
  if (codigo) where.codigo = { [Op.like]: `%${codigo.replace(/[%_]/g, '')}%` };
  const bilhetes = await Bilhete.findAll({
    where,
    attributes: ['id', 'codigo', 'estado'],
    include: [{
      model: Trip, required: true, attributes: ['id', 'departureAt', 'empresaId'],
      include: [{ model: Route, attributes: ['origin', 'destination'] }, { model: Empresa, attributes: ['id', 'nome', 'logoUrl'] }]
    }],
    order: [['id', 'DESC']], limit: 10
  });
  return bilhetes;
}

// A triagem usa regras transparentes e dados confirmados; o cliente não escolhe a prioridade.
export function classificarPrioridadeTicket({ assunto, categoria, mensagem, partidaEm }, agora = new Date()) {
  const texto = textoNormalizado(`${assunto || ''} ${mensagem || ''}`);
  let pontuacao = 35;
  const motivos = [];
  if (categoria === 'PAGAMENTO') { pontuacao += 15; motivos.push('questão de pagamento'); }
  if (categoria === 'RECLAMACAO') { pontuacao += 10; motivos.push('reclamação'); }
  if (/cobrou|duplicad|dinheiro|pagamento.*falh|sem bilhete/.test(texto)) { pontuacao += 25; motivos.push('possível impacto financeiro'); }
  if (/urgente|embarque|partida|perdi|cancelad|nao consigo viajar|não consigo viajar/.test(texto)) { pontuacao += 18; motivos.push('possível impedimento de viagem'); }
  if (/acidente|seguranca|segurança|perigo|amea[cç]a/.test(texto)) { pontuacao += 40; motivos.push('segurança'); }
  const horasAtePartida = partidaEm ? (new Date(partidaEm) - agora) / 3600000 : Infinity;
  if (horasAtePartida >= 0 && horasAtePartida <= 24) { pontuacao += 20; motivos.push('partida nas próximas 24 horas'); }
  if (horasAtePartida < 0) { pontuacao -= 8; motivos.push('viagem já realizada'); }
  pontuacao = Math.max(0, Math.min(100, pontuacao));
  const prioridade = pontuacao >= 85 ? 'URGENTE' : pontuacao >= 65 ? 'ALTA' : pontuacao >= 30 ? 'NORMAL' : 'BAIXA';
  return { prioridade, pontuacao, motivo: motivos.join('; ') || 'triagem padrão' };
}

export async function listarTickets(utilizador) {
  if (utilizador.perfil === 'ADMIN') throw erroAcesso('O suporte comercial é administrado pelas empresas.');
  const where = utilizador.perfil === 'EMPRESA_ADMIN' ? { empresaId: utilizador.empresaId }
      : utilizador.perfil === 'GESTOR_SUPORTE' ? { gestorId: utilizador.id, empresaId: utilizador.empresaId }
      : { utilizadorId: utilizador.id };
  return TicketSuporte.findAll({ where, include: inclusoesTicket, order: [['actualizado_em', 'DESC']] });
}

export async function obterTicketPorId(id, utilizador, transaction) {
  const ticket = await TicketSuporte.findByPk(id, {
    include: [...inclusoesTicket, {
      model: MensagemSuporte,
      as: 'Mensagens',
      include: [{ model: User, as: 'Remetente', attributes: ['id', 'nome', 'apelido', 'perfil'] }]
    }],
    order: [[{ model: MensagemSuporte, as: 'Mensagens' }, 'criado_em', 'ASC']],
    transaction
  });
  if (!ticket) throw erroNaoEncontrado();
  garantirAcesso(ticket, utilizador);
  return ticket;
}

export async function adicionarMensagem(id, utilizador, conteudo, anexo = {}) {
  const texto = String(conteudo || '').trim();
  if ((!texto && !anexo.imagemUrl) || texto.length > 4000) throw erroValidacao('Escreva uma mensagem ou anexe uma imagem. O texto pode ter até 4000 caracteres.');
  const ticket = await TicketSuporte.findByPk(id);
  if (!ticket) throw erroNaoEncontrado();
  garantirAcesso(ticket, utilizador);
  if (['RESOLVIDO', 'ENCERRADO'].includes(ticket.estado)) throw erroConflito('Este ticket já não aceita novas mensagens.');

  const autorTipo = utilizador.perfil;
  const mensagem = await MensagemSuporte.create({
    ticketId: ticket.id, remetenteId: utilizador.id, autorTipo,
    conteudo: texto, imagemUrl: anexo.imagemUrl || null, imagemNome: anexo.imagemNome || null
  });
  if (utilizador.perfil !== 'PASSAGEIRO' && ticket.estado === 'ABERTO') await ticket.update({ estado: 'EM_ATENDIMENTO' });
  if (utilizador.perfil === 'PASSAGEIRO' && ticket.estado === 'AGUARDA_UTILIZADOR') await ticket.update({ estado: 'EM_ATENDIMENTO' });
  return MensagemSuporte.findByPk(mensagem.id, { include: [{ model: User, as: 'Remetente', attributes: ['id', 'nome', 'apelido', 'perfil'] }] });
}

export async function atribuirTicket(id, gestorId, administrador) {
  if (administrador.perfil !== 'EMPRESA_ADMIN') throw erroAcesso();
  const [ticket, gestor] = await Promise.all([TicketSuporte.findByPk(id), User.findByPk(gestorId)]);
  if (!ticket) throw erroNaoEncontrado();
  if (!gestor || gestor.perfil !== 'GESTOR_SUPORTE' || !gestor.activo) throw erroValidacao('Selecione um gestor de suporte ativo.');
  if (String(ticket.empresaId) !== String(gestor.empresaId)
    || String(ticket.empresaId) !== String(administrador.empresaId)) {
    throw erroAcesso('O ticket e o atendente devem pertencer à mesma empresa.');
  }
  await ticket.update({ gestorId: gestor.id, estado: ticket.estado === 'ABERTO' ? 'EM_ATENDIMENTO' : ticket.estado });
  await MensagemSuporte.create({ ticketId: ticket.id, autorTipo: 'SISTEMA', conteudo: `Ticket atribuído a ${gestor.nome} ${gestor.apelido}.` });
  return obterTicketPorId(ticket.id, administrador);
}

export async function actualizarEstadoTicket(id, estado, utilizador) {
  const ticket = await TicketSuporte.findByPk(id);
  if (!ticket) throw erroNaoEncontrado();
  garantirAcesso(ticket, utilizador);
  const permitidos = utilizador.perfil === 'PASSAGEIRO' ? ['ENCERRADO'] : ['EM_ATENDIMENTO', 'AGUARDA_UTILIZADOR', 'RESOLVIDO', 'ENCERRADO'];
  if (!permitidos.includes(estado)) throw erroValidacao('Transição de estado não permitida.');
  if (utilizador.perfil === 'PASSAGEIRO' && ticket.estado !== 'RESOLVIDO') throw erroConflito('O passageiro só pode encerrar um ticket resolvido.');
  const datas = { resolvidoEm: estado === 'RESOLVIDO' ? new Date() : ticket.resolvidoEm, encerradoEm: estado === 'ENCERRADO' ? new Date() : ticket.encerradoEm };
  await ticket.update({ estado, ...datas });
  await MensagemSuporte.create({ ticketId: ticket.id, autorTipo: 'SISTEMA', conteudo: `Estado alterado para ${estado.replaceAll('_', ' ').toLowerCase()}.` });
  return obterTicketPorId(ticket.id, utilizador);
}

export async function listarGestoresSuporte(administrador) {
  return User.findAll({
    where: {
      perfil: 'GESTOR_SUPORTE', activo: true,
      empresaId: administrador.empresaId
    },
    attributes: ['id', 'nome', 'apelido', 'telefone', 'empresaId'],
    order: [['nome', 'ASC'], ['apelido', 'ASC']]
  });
}

export function garantirAcesso(ticket, utilizador) {
  const permitido = (utilizador.perfil === 'EMPRESA_ADMIN' && String(ticket.empresaId) === String(utilizador.empresaId))
    || (utilizador.perfil === 'GESTOR_SUPORTE' && String(ticket.empresaId) === String(utilizador.empresaId) && String(ticket.gestorId) === String(utilizador.id))
    || (utilizador.perfil === 'PASSAGEIRO' && String(ticket.utilizadorId) === String(utilizador.id));
  if (!permitido) throw erroAcesso('Não tem acesso a este ticket.');
}

function erroAcesso(mensagem = 'Acesso não autorizado ao suporte.') { const erro = new Error(mensagem); erro.statusCode = 403; return erro; }
function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroNaoEncontrado() { const erro = new Error('Ticket de suporte não encontrado.'); erro.statusCode = 404; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }

export const estadosTicketsActivos = { [Op.not]: 'ENCERRADO' };
