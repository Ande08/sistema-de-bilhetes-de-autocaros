import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import ChatTicketSuporte, { traduzirEstado } from './ChatTicketSuporte.jsx';
import { consultarAssistenteSuporte, criarTicketSuporte, listarEmpresas, listarTicketsSuporte } from '../servicos/api.js';

export default function PaginaSuportePassageiro() {
  const [mensagensIa, setMensagensIa] = useState([{ autor: 'IA', texto: 'Olá. Sou o assistente virtual da Viagem Bus. Posso ajudar com bilhetes, pagamentos, assentos, horários e dados da conta.' }]);
  const [tickets, setTickets] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');

  function carregarTickets() { listarTicketsSuporte().then(setTickets).catch((falha) => setErro(falha.message)); }
  useEffect(() => { carregarTickets(); listarEmpresas().then(setEmpresas).catch((falha) => setErro(falha.message)); }, []);

  async function perguntar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const pergunta = new FormData(formulario).get('mensagem').trim();
    if (!pergunta) return;
    setMensagensIa((itens) => [...itens, { autor: 'PASSAGEIRO', texto: pergunta }]);
    formulario.reset(); setAProcessar(true); setErro('');
    try { const resposta = await consultarAssistenteSuporte(pergunta); setMensagensIa((itens) => [...itens, { autor: 'IA', texto: resposta.mensagem }]); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function criar(evento) {
    evento.preventDefault(); setAProcessar(true); setErro('');
    try {
      const criado = await criarTicketSuporte(Object.fromEntries(new FormData(evento.currentTarget)));
      setAbrirFormulario(false); setTicketActivo(criado.id); carregarTickets();
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  if (ticketActivo) return <section className="pagina-suporte"><button className="botao-voltar-suporte" onClick={() => { setTicketActivo(null); carregarTickets(); }}>Voltar ao suporte</button><ChatTicketSuporte ticketId={ticketActivo} perfil="PASSAGEIRO" aoActualizar={carregarTickets} /></section>;

  return <section className="pagina-suporte">
    <div className="cabecalho-suporte vidro"><span className="suporte-icone"><Icone nome="suporte" /></span><div><p className="etiqueta">Centro de ajuda</p><h2>Como podemos ajudar?</h2><p>Comece pelo assistente virtual ou acompanhe um pedido de suporte humano.</p></div></div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    <div className="grelha-suporte-passageiro">
      <article className="assistente-virtual vidro"><header><div><strong>Assistente virtual</strong><small>Respostas imediatas às perguntas frequentes</small></div><span>Disponível</span></header><div className="mensagens-assistente">{mensagensIa.map((item, indice) => <p key={indice} className={item.autor === 'IA' ? 'resposta-ia' : 'pergunta-utilizador'}>{item.texto}</p>)}</div><form onSubmit={perguntar}><input name="mensagem" placeholder="Faça uma pergunta..." required /><button disabled={aProcessar}>Enviar</button></form><button className="pedir-humano" onClick={() => setAbrirFormulario(true)}>Ainda preciso de ajuda humana</button></article>
      <aside className="lista-tickets-suporte vidro"><div className="titulo-secao"><h3>Meus pedidos</h3><button onClick={() => setAbrirFormulario(true)}>Novo pedido</button></div>{tickets.length ? tickets.map((ticket) => <button className="resumo-ticket" key={ticket.id} onClick={() => setTicketActivo(ticket.id)}><span><strong>{ticket.assunto}</strong><small>{ticket.Empresa?.nome} · {ticket.codigo}</small></span><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></button>) : <p className="sem-tickets">Ainda não abriu nenhum pedido humano.</p>}</aside>
    </div>
    {abrirFormulario && <div className="modal-fundo"><form className="formulario-ticket vidro" onSubmit={criar}><div className="modal-topo"><div><p className="etiqueta">Atendimento humano</p><h2>Abrir pedido de suporte</h2></div><button type="button" className="fechar-modal" onClick={() => setAbrirFormulario(false)}>×</button></div><label>Empresa responsável<select name="empresaId" required><option value="">Selecionar empresa</option>{empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}</select></label><label>Assunto<input name="assunto" minLength="5" maxLength="160" required /></label><label>Categoria<select name="categoria"><option value="BILHETE">Bilhete</option><option value="PAGAMENTO">Pagamento</option><option value="VIAGEM">Viagem</option><option value="CONTA">Conta</option><option value="RECLAMACAO">Reclamação</option><option value="OUTRO">Outro</option></select></label><label>Prioridade<select name="prioridade"><option value="NORMAL">Normal</option><option value="BAIXA">Baixa</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label><label className="campo-mensagem-ticket">Descreva a situação<textarea name="mensagem" maxLength="4000" required /></label><button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A abrir pedido...' : 'Abrir pedido'}</button></form></div>}
  </section>;
}
