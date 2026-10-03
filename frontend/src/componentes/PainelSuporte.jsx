import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Icone from './Icone.jsx';
import ChatTicketSuporte, { traduzirEstado } from './ChatTicketSuporte.jsx';
import { listarTicketsSuporte, obterSessaoGuardada, URL_SERVIDOR } from '../servicos/api.js';

export default function PainelSuporte({ utilizador, aoSair }) {
  const [tickets, setTickets] = useState([]);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [estado, setEstado] = useState('ACTIVOS');
  const [erro, setErro] = useState('');

  function carregar() { listarTicketsSuporte().then(setTickets).catch((falha) => setErro(falha.message)); }
  useEffect(carregar, []);
  useEffect(() => {
    const socket = io(URL_SERVIDOR, { auth: { token: obterSessaoGuardada()?.token } });
    socket.on('suporte:atribuido', carregar);
    return () => socket.disconnect();
  }, []);

  const visiveis = tickets.filter((ticket) => estado === 'TODOS' || (estado === 'ACTIVOS' ? !['RESOLVIDO', 'ENCERRADO'].includes(ticket.estado) : ticket.estado === estado));
  return <div className="admin-aplicacao suporte-aplicacao">
    <aside className="admin-lateral"><div className="logotipo"><span className="logotipo-icone"><Icone nome="suporte" /></span><div><strong>Viagem Bus</strong><small>Gestão de suporte</small></div></div><div className="identificacao-gestor"><span className="avatar">{utilizador.nome.charAt(0)}</span><div><strong>{utilizador.nome}</strong><small>Gestor de suporte</small></div></div><button className="admin-sair" onClick={aoSair}>Terminar sessão</button></aside>
    <main className="admin-conteudo"><header className="admin-topo"><div><p>Atendimento humano</p><h1>Tickets atribuídos</h1></div><div className="indicador-online">Disponível para atendimento</div></header>{erro && <p className="mensagem-formulario erro">{erro}</p>}<div className="area-atendimento-suporte"><section className="fila-suporte vidro"><div className="titulo-secao"><h3>Minha fila</h3><span>{visiveis.length} tickets</span></div><select value={estado} onChange={(evento) => setEstado(evento.target.value)}><option value="ACTIVOS">Tickets ativos</option><option value="AGUARDA_UTILIZADOR">Aguardam passageiro</option><option value="RESOLVIDO">Resolvidos</option><option value="ENCERRADO">Encerrados</option><option value="TODOS">Todos</option></select><div className="itens-fila-suporte">{visiveis.map((ticket) => <button key={ticket.id} className={String(ticketActivo) === String(ticket.id) ? 'activo' : ''} onClick={() => setTicketActivo(ticket.id)}><span><strong>{ticket.assunto}</strong><small>{ticket.codigo} · {ticket.Passageiro?.nome}</small></span><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></button>)}{!visiveis.length && <p>Nenhum ticket nesta fila.</p>}</div></section>{ticketActivo ? <ChatTicketSuporte ticketId={ticketActivo} perfil="GESTOR_SUPORTE" aoActualizar={carregar} /> : <section className="chat-ticket vazio-chat"><Icone nome="suporte" /><h3>Selecione um ticket</h3><p>Escolha um atendimento na sua fila para consultar o histórico e responder.</p></section>}</div></main>
  </div>;
}
