import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { actualizarEstadoTicketSuporte, enviarMensagemSuporte, obterSessaoGuardada, obterTicketSuporte, URL_SERVIDOR } from '../servicos/api.js';

export default function ChatTicketSuporte({ ticketId, perfil, aoActualizar }) {
  const [ticket, setTicket] = useState(null);
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [imagem, setImagem] = useState(null);
  const [preVisualizacao, setPreVisualizacao] = useState('');
  const fimMensagens = useRef(null);
  const utilizadorActualId = obterSessaoGuardada()?.utilizador?.id;

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

  useEffect(() => () => { if (preVisualizacao) URL.revokeObjectURL(preVisualizacao); }, [preVisualizacao]);

  function seleccionarImagem(evento) {
    const ficheiro = evento.target.files?.[0];
    setErro('');
    if (!ficheiro) return removerImagem();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.type)) {
      evento.target.value = ''; return setErro('Seleccione uma imagem JPEG, PNG ou WebP.');
    }
    if (ficheiro.size > 2 * 1024 * 1024) {
      evento.target.value = ''; return setErro('A imagem deve ter no máximo 2 MB.');
    }
    if (preVisualizacao) URL.revokeObjectURL(preVisualizacao);
    setImagem(ficheiro);
    setPreVisualizacao(URL.createObjectURL(ficheiro));
  }

  function removerImagem() {
    if (preVisualizacao) URL.revokeObjectURL(preVisualizacao);
    setImagem(null); setPreVisualizacao('');
  }

  async function enviar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const mensagem = new FormData(formulario).get('mensagem');
    if (!mensagem.trim() && !imagem) return;
    setAEnviar(true); setErro('');
    try {
      const anexo = imagem ? { nome: imagem.name, dados: await lerFicheiroComoDataUrl(imagem) } : null;
      const criada = await enviarMensagemSuporte(ticketId, mensagem, anexo);
      setTicket((actual) => !actual || actual.Mensagens.some((item) => String(item.id) === String(criada.id)) ? actual : { ...actual, Mensagens: [...actual.Mensagens, criada] });
      formulario.reset(); removerImagem(); aoActualizar?.();
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
    <header className="chat-ticket-topo"><div><small>{ticket.codigo}</small><h3>{ticket.assunto}</h3><span>{traduzirCategoria(ticket.categoria)} · {`${ticket.Passageiro?.nome || ''} ${ticket.Passageiro?.apelido || ''}`.trim()}</span></div><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></header>
    <div className="mensagens-suporte">
      {ticket.Mensagens.map((mensagem) => {
        const sistema = ['SISTEMA', 'IA'].includes(mensagem.autorTipo);
        const propria = mensagemFoiEnviadaPeloUtilizador(mensagem, utilizadorActualId);
        return <article key={mensagem.id} className={`mensagem-suporte ${sistema ? 'mensagem-sistema' : propria ? 'mensagem-propria' : 'mensagem-recebida'}`}><strong>{propria ? 'Você' : mensagem.Remetente ? `${mensagem.Remetente.nome} ${mensagem.Remetente.apelido || ''}`.trim() : (mensagem.autorTipo === 'SISTEMA' ? 'Sistema' : 'Assistente virtual')}</strong>{mensagem.conteudo && <p>{mensagem.conteudo}</p>}{mensagem.imagemUrl && <a className="imagem-mensagem-suporte" href={`${URL_SERVIDOR}${mensagem.imagemUrl}`} target="_blank" rel="noreferrer"><img src={`${URL_SERVIDOR}${mensagem.imagemUrl}`} alt={mensagem.imagemNome || 'Imagem enviada no suporte'} /></a>}<time>{formatarDataHora(mensagem.criado_em)}</time></article>;
      })}
      <span ref={fimMensagens} />
    </div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    {!encerrado && <form className="formulario-mensagem-suporte" onSubmit={enviar}>{preVisualizacao && <div className="pre-visualizacao-suporte"><img src={preVisualizacao} alt="Pré-visualização do anexo" /><span>{imagem?.name}</span><button type="button" onClick={removerImagem} aria-label="Remover imagem">Remover</button></div>}<textarea name="mensagem" maxLength="4000" placeholder="Escreva a sua mensagem ou anexe uma imagem..." /><label className="botao-anexar-suporte">Anexar imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagem} /></label><button disabled={aEnviar}>{aEnviar ? 'A enviar...' : 'Enviar'}</button></form>}
    <footer className="acoes-ticket-suporte">
      {perfil !== 'PASSAGEIRO' && !encerrado && <><button onClick={() => mudarEstado('AGUARDA_UTILIZADOR')}>Aguardar passageiro</button><button onClick={() => mudarEstado('RESOLVIDO')}>Marcar como resolvido</button></>}
      {perfil === 'PASSAGEIRO' && ticket.estado === 'RESOLVIDO' && <button onClick={() => mudarEstado('ENCERRADO')}>Confirmar e encerrar</button>}
    </footer>
  </section>;
}

export function traduzirEstado(estado) { return { ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento', AGUARDA_UTILIZADOR: 'Aguarda passageiro', RESOLVIDO: 'Resolvido', ENCERRADO: 'Encerrado' }[estado] || estado; }
export function traduzirCategoria(categoria) { return { BILHETE: 'Bilhete', PAGAMENTO: 'Pagamento', VIAGEM: 'Viagem', CONTA: 'Conta', RECLAMACAO: 'Reclamação', OUTRO: 'Outro' }[categoria] || categoria; }
export function mensagemFoiEnviadaPeloUtilizador(mensagem, utilizadorId) { return utilizadorId != null && mensagem.remetenteId != null && !['SISTEMA', 'IA'].includes(mensagem.autorTipo) && String(mensagem.remetenteId) === String(utilizadorId); }
function formatarDataHora(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor)); }
function lerFicheiroComoDataUrl(ficheiro) { return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.onload = () => resolver(leitor.result); leitor.onerror = () => rejeitar(new Error('Não foi possível ler a imagem.')); leitor.readAsDataURL(ficheiro); }); }
