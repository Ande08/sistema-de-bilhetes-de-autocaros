import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { MensagemSuporte, TicketSuporte, User } from '../models/index.js';

const inclusoesTicket = [
  { model: User, as: 'Passageiro', attributes: ['id', 'nome', 'apelido', 'telefone'] },
  { model: User, as: 'Gestor', attributes: ['id', 'nome', 'apelido', 'telefone'] }
];

const respostasFrequentes = [
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

export async function criarTicket(utilizador, { assunto, categoria = 'OUTRO', prioridade = 'NORMAL', mensagem }) {
  if (utilizador.perfil !== 'PASSAGEIRO') throw erroAcesso('Apenas passageiros podem abrir pedidos de suporte.');
  if (!assunto?.trim() || assunto.trim().length < 5 || !mensagem?.trim()) throw erroValidacao('Assunto e mensagem são obrigatórios.');
  const categorias = ['BILHETE', 'PAGAMENTO', 'VIAGEM', 'CONTA', 'RECLAMACAO', 'OUTRO'];
  const prioridades = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  if (!categorias.includes(categoria) || !prioridades.includes(prioridade)) throw erroValidacao('Categoria ou prioridade inválida.');

  return sequelize.transaction(async (transaction) => {
    const ticket = await TicketSuporte.create({
      codigo: `SUP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`,
      utilizadorId: utilizador.id,
      assunto: assunto.trim(), categoria, prioridade
    }, { transaction });
    await MensagemSuporte.create({ ticketId: ticket.id, remetenteId: utilizador.id, autorTipo: 'PASSAGEIRO', conteudo: mensagem.trim() }, { transaction });
    return obterTicketPorId(ticket.id, utilizador, transaction);
  });
}

export async function listarTickets(utilizador) {
  const where = utilizador.perfil === 'ADMIN' ? {}
    : utilizador.perfil === 'GESTOR_SUPORTE' ? { gestorId: utilizador.id }
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

export async function adicionarMensagem(id, utilizador, conteudo) {
  if (!conteudo?.trim() || conteudo.trim().length > 4000) throw erroValidacao('A mensagem deve ter entre 1 e 4000 caracteres.');
  const ticket = await TicketSuporte.findByPk(id);
  if (!ticket) throw erroNaoEncontrado();
  garantirAcesso(ticket, utilizador);
  if (['RESOLVIDO', 'ENCERRADO'].includes(ticket.estado)) throw erroConflito('Este ticket já não aceita novas mensagens.');

  const autorTipo = utilizador.perfil;
  const mensagem = await MensagemSuporte.create({ ticketId: ticket.id, remetenteId: utilizador.id, autorTipo, conteudo: conteudo.trim() });
  if (utilizador.perfil !== 'PASSAGEIRO' && ticket.estado === 'ABERTO') await ticket.update({ estado: 'EM_ATENDIMENTO' });
  if (utilizador.perfil === 'PASSAGEIRO' && ticket.estado === 'AGUARDA_UTILIZADOR') await ticket.update({ estado: 'EM_ATENDIMENTO' });
  return MensagemSuporte.findByPk(mensagem.id, { include: [{ model: User, as: 'Remetente', attributes: ['id', 'nome', 'apelido', 'perfil'] }] });
}

export async function atribuirTicket(id, gestorId, administrador) {
  if (administrador.perfil !== 'ADMIN') throw erroAcesso();
  const [ticket, gestor] = await Promise.all([TicketSuporte.findByPk(id), User.findByPk(gestorId)]);
  if (!ticket) throw erroNaoEncontrado();
  if (!gestor || gestor.perfil !== 'GESTOR_SUPORTE' || !gestor.activo) throw erroValidacao('Selecione um gestor de suporte ativo.');
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

export async function listarGestoresSuporte() {
  return User.findAll({ where: { perfil: 'GESTOR_SUPORTE', activo: true }, attributes: ['id', 'nome', 'apelido', 'telefone'], order: [['nome', 'ASC'], ['apelido', 'ASC']] });
}

export function garantirAcesso(ticket, utilizador) {
  const permitido = utilizador.perfil === 'ADMIN'
    || (utilizador.perfil === 'GESTOR_SUPORTE' && String(ticket.gestorId) === String(utilizador.id))
    || (utilizador.perfil === 'PASSAGEIRO' && String(ticket.utilizadorId) === String(utilizador.id));
  if (!permitido) throw erroAcesso('Não tem acesso a este ticket.');
}

function erroAcesso(mensagem = 'Acesso não autorizado ao suporte.') { const erro = new Error(mensagem); erro.statusCode = 403; return erro; }
function erroValidacao(mensagem) { const erro = new Error(mensagem); erro.statusCode = 400; return erro; }
function erroNaoEncontrado() { const erro = new Error('Ticket de suporte não encontrado.'); erro.statusCode = 404; return erro; }
function erroConflito(mensagem) { const erro = new Error(mensagem); erro.statusCode = 409; return erro; }

export const estadosTicketsActivos = { [Op.not]: 'ENCERRADO' };
