import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { actualizarEstadoTicketSuporte, enviarMensagemSuporte, obterSessaoGuardada, obterTicketSuporte, URL_SERVIDOR } from '../servicos/api.js';

export default function ChatTicketSuporte({ ticketId, perfil, aoActualizar }) {
  const [ticket, setTicket] = useState(null);
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const fimMensagens = useRef(null);

  useEffect(() => {
    let activo = true;
    setTicket(null); setErro('');
    obterTicketSuporte(ticketId).then((dados) => activo && setTicket(dados)).catch((falha) => activo && setErro(falha.message));

    const socket = io(URL_SERVIDOR, { auth: { token: obterSessaoGuardada()?.token } });
    socket.emit('suporte:entrar', ticketId, (resposta) => !resposta?.sucesso && activo && setErro(resposta?.mensagem));
    socket.on('suporte:mensagem', (mensagem) => {
      if (String(mensagem.ticketId) !== String(ticketId)) return;
      setTicket((actual) => {
        if (!actual || actual.Mensagens.some((item) => String(item.id) === String(mensagem.id))) return actual;
        return { ...actual, Mensagens: [...actual.Mensagens, mensagem] };
      });
    });
    socket.on('suporte:ticket-actualizado', (actualizado) => {
      if (String(actualizado.id) === String(ticketId)) obterTicketSuporte(ticketId).then(setTicket);
    });
    return () => { activo = false; socket.disconnect(); };
  }, [ticketId]);

  useEffect(() => { fimMensagens.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.Mensagens?.length]);

  async function enviar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const mensagem = new FormData(formulario).get('mensagem');
    if (!mensagem.trim()) return;
    setAEnviar(true); setErro('');
    try {
      const criada = await enviarMensagemSuporte(ticketId, mensagem);
      setTicket((actual) => !actual || actual.Mensagens.some((item) => String(item.id) === String(criada.id)) ? actual : { ...actual, Mensagens: [...actual.Mensagens, criada] });
      formulario.reset(); aoActualizar?.();
    } catch (falha) { setErro(falha.message); }
    finally { setAEnviar(false); }
  }

  async function mudarEstado(estado) {
    setErro('');
    try { const actualizado = await actualizarEstadoTicketSuporte(ticketId, estado); setTicket(actualizado); aoActualizar?.(); }
    catch (falha) { setErro(falha.message); }
  }

  if (!ticket) return <div className="chat-ticket vazio-chat">{erro || 'A carregar conversa...'}</div>;
  const encerrado = ['RESOLVIDO', 'ENCERRADO'].includes(ticket.estado);
  return <section className="chat-ticket">
    <header className="chat-ticket-topo"><div><small>{ticket.codigo}</small><h3>{ticket.assunto}</h3><span>{traduzirCategoria(ticket.categoria)} · {ticket.Passageiro?.nome}</span></div><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></header>
    <div className="mensagens-suporte">
      {ticket.Mensagens.map((mensagem) => <article key={mensagem.id} className={`mensagem-suporte mensagem-${mensagem.autorTipo.toLowerCase()}`}><strong>{mensagem.Remetente?.nome || (mensagem.autorTipo === 'SISTEMA' ? 'Sistema' : 'Assistente virtual')}</strong><p>{mensagem.conteudo}</p><time>{formatarDataHora(mensagem.criado_em)}</time></article>)}
      <span ref={fimMensagens} />
    </div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    {!encerrado && <form className="formulario-mensagem-suporte" onSubmit={enviar}><textarea name="mensagem" maxLength="4000" placeholder="Escreva a sua mensagem..." required /><button disabled={aEnviar}>{aEnviar ? 'A enviar...' : 'Enviar'}</button></form>}
    <footer className="acoes-ticket-suporte">
      {perfil !== 'PASSAGEIRO' && !encerrado && <><button onClick={() => mudarEstado('AGUARDA_UTILIZADOR')}>Aguardar passageiro</button><button onClick={() => mudarEstado('RESOLVIDO')}>Marcar como resolvido</button></>}
      {perfil === 'PASSAGEIRO' && ticket.estado === 'RESOLVIDO' && <button onClick={() => mudarEstado('ENCERRADO')}>Confirmar e encerrar</button>}
    </footer>
  </section>;
}

export function traduzirEstado(estado) { return { ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento', AGUARDA_UTILIZADOR: 'Aguarda passageiro', RESOLVIDO: 'Resolvido', ENCERRADO: 'Encerrado' }[estado] || estado; }
export function traduzirCategoria(categoria) { return { BILHETE: 'Bilhete', PAGAMENTO: 'Pagamento', VIAGEM: 'Viagem', CONTA: 'Conta', RECLAMACAO: 'Reclamação', OUTRO: 'Outro' }[categoria] || categoria; }
function formatarDataHora(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor)); }
