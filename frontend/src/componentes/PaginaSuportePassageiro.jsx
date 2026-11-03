import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import ChatTicketSuporte, { traduzirEstado } from './ChatTicketSuporte.jsx';
import { consultarAssistenteSuporte, criarTicketSuporte, listarTicketsSuporte, pesquisarBilhetesSuporte } from '../servicos/api.js';

export default function PaginaSuportePassageiro() {
  const [mensagensIa, setMensagensIa] = useState([{ autor: 'IA', texto: 'Olá. Sou o assistente virtual da Viagem Bus. Posso ajudar com bilhetes, pagamentos, assentos, horários e dados da conta.' }]);
  const [tickets, setTickets] = useState([]);
  const [bilhetes, setBilhetes] = useState([]);
  const [codigoBilhete, setCodigoBilhete] = useState('');
  const [imagem, setImagem] = useState(null);
  const [preVisualizacao, setPreVisualizacao] = useState('');
  const [ticketActivo, setTicketActivo] = useState(null);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');

  function carregarTickets() { listarTicketsSuporte().then(setTickets).catch((falha) => setErro(falha.message)); }
  useEffect(() => { carregarTickets(); }, []);

  async function abrirPedido() {
    setAbrirFormulario(true); setErro(''); setAProcessar(true);
    try { setBilhetes(await pesquisarBilhetesSuporte('')); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function pesquisarBilhete() {
    setAProcessar(true); setErro('');
    try { setBilhetes(await pesquisarBilhetesSuporte(codigoBilhete)); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  function seleccionarImagem(evento) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.type) || ficheiro.size > 2 * 1024 * 1024) {
      evento.target.value = ''; setErro('A imagem deve ser JPEG, PNG ou WebP e ter no máximo 2 MB.'); return;
    }
    if (preVisualizacao) URL.revokeObjectURL(preVisualizacao);
    setImagem(ficheiro); setPreVisualizacao(URL.createObjectURL(ficheiro));
  }

  function removerImagem() {
    if (preVisualizacao) URL.revokeObjectURL(preVisualizacao);
    setImagem(null); setPreVisualizacao('');
  }

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
      const dados = Object.fromEntries(new FormData(evento.currentTarget));
      if (imagem) dados.imagem = { nome: imagem.name, dados: await lerFicheiroComoDataUrl(imagem) };
      const criado = await criarTicketSuporte(dados);
      setAbrirFormulario(false); removerImagem(); setTicketActivo(criado.id); carregarTickets();
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  if (ticketActivo) return <section className="pagina-suporte"><button className="botao-voltar-suporte" onClick={() => { setTicketActivo(null); carregarTickets(); }}>Voltar ao suporte</button><ChatTicketSuporte ticketId={ticketActivo} perfil="PASSAGEIRO" aoActualizar={carregarTickets} /></section>;

  return <section className="pagina-suporte">
    <div className="cabecalho-suporte vidro"><span className="suporte-icone"><Icone nome="suporte" /></span><div><p className="etiqueta">Centro de ajuda</p><h2>Como podemos ajudar?</h2><p>Comece pelo assistente virtual ou acompanhe um pedido de suporte humano.</p></div></div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    <div className="grelha-suporte-passageiro">
      <article className="assistente-virtual vidro"><header><div><strong>Assistente virtual</strong><small>Respostas imediatas às perguntas frequentes</small></div><span>Disponível</span></header><div className="mensagens-assistente">{mensagensIa.map((item, indice) => <p key={indice} className={item.autor === 'IA' ? 'resposta-ia' : 'pergunta-utilizador'}>{item.texto}</p>)}</div><form onSubmit={perguntar}><input name="mensagem" placeholder="Faça uma pergunta..." required /><button disabled={aProcessar}>Enviar</button></form><button className="pedir-humano" onClick={abrirPedido}>Ainda preciso de ajuda humana</button></article>
      <aside className="lista-tickets-suporte vidro"><div className="titulo-secao"><h3>Meus pedidos</h3><button onClick={abrirPedido}>Novo pedido</button></div>{tickets.length ? tickets.map((ticket) => <button className="resumo-ticket" key={ticket.id} onClick={() => setTicketActivo(ticket.id)}><span><strong>{ticket.assunto}</strong><small>{ticket.Empresa?.nome} · {ticket.Bilhete?.codigo || ticket.codigo}</small></span><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></button>) : <p className="sem-tickets">Ainda não abriu nenhum pedido humano.</p>}</aside>
    </div>
    {abrirFormulario && <div className="modal-fundo"><form className="formulario-ticket vidro" onSubmit={criar}><div className="modal-topo"><div><p className="etiqueta">Atendimento humano</p><h2>Abrir pedido de suporte</h2><p>O bilhete identifica automaticamente a empresa responsável.</p></div><button type="button" className="fechar-modal" onClick={() => { setAbrirFormulario(false); removerImagem(); }}>×</button></div><div className="pesquisa-bilhete-suporte"><label>Código do bilhete<input value={codigoBilhete} onChange={(evento) => setCodigoBilhete(evento.target.value.toUpperCase())} placeholder="Digite todo ou parte do código" /></label><button type="button" onClick={pesquisarBilhete} disabled={aProcessar}>Pesquisar</button></div><label className="campo-bilhete-ticket">Bilhete<select name="bilheteId" required><option value="">Selecionar bilhete</option>{bilhetes.map((bilhete) => <option key={bilhete.id} value={bilhete.id}>{bilhete.codigo} · {bilhete.Trip?.Route?.origin} → {bilhete.Trip?.Route?.destination} · {bilhete.Trip?.Empresa?.nome}</option>)}</select></label><label>Assunto<input name="assunto" minLength="5" maxLength="160" required /></label><label>Categoria<select name="categoria"><option value="BILHETE">Bilhete</option><option value="PAGAMENTO">Pagamento</option><option value="VIAGEM">Viagem</option><option value="CONTA">Conta</option><option value="RECLAMACAO">Reclamação</option><option value="OUTRO">Outro</option></select></label><p className="aviso-prioridade-automatica">A prioridade será calculada automaticamente com base no problema e na proximidade da partida.</p><label className="campo-mensagem-ticket">Descreva a situação<textarea name="mensagem" maxLength="4000" required /></label>{preVisualizacao && <div className="pre-visualizacao-suporte"><img src={preVisualizacao} alt="Pré-visualização" /><span>{imagem?.name}</span><button type="button" onClick={removerImagem}>Remover</button></div>}<label className="botao-anexar-suporte campo-anexo-ticket">Anexar imagem opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagem} /></label><button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A abrir pedido...' : 'Abrir pedido'}</button></form></div>}
  </section>;
}

function lerFicheiroComoDataUrl(ficheiro) { return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.onload = () => resolver(leitor.result); leitor.onerror = () => rejeitar(new Error('Não foi possível ler a imagem.')); leitor.readAsDataURL(ficheiro); }); }
