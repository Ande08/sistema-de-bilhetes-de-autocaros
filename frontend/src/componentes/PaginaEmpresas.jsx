import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import { URL_SERVIDOR, avaliarEmpresa, contactarEmpresa, listarEmpresas, obterEmpresaPublica } from '../servicos/api.js';

export default function PaginaEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaAberta, setEmpresaAberta] = useState(null);
  const [erro, setErro] = useState('');

  async function carregarEmpresas() {
    try { setEmpresas(await listarEmpresas()); }
    catch (falha) { setErro(falha.message); }
  }

  useEffect(() => { carregarEmpresas(); }, []);

  return <section className="pagina-empresas-cliente">
    <div className="titulo-secao titulo-catalogo-empresas"><div><p className="etiqueta">Empresas de transporte</p><h3>Conheça quem realiza as viagens</h3><p>Consulte informações públicas, próximas partidas, avaliações e contacte diretamente a empresa.</p></div></div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    <div className="grelha-empresas-cliente">{empresas.map((empresa) => <article className="cartao-empresa-cliente vidro" key={empresa.id}>
      {empresa.logoUrl ? <img src={`${URL_SERVIDOR}${empresa.logoUrl}`} alt={`Logótipo da ${empresa.nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}
      <div><h3>{empresa.nome}</h3><p>{empresa.descricao || 'Empresa de transporte registada na plataforma.'}</p><small>{empresa.totalAvaliacoes ? `${empresa.avaliacaoMedia}/5 em ${empresa.totalAvaliacoes} avaliações` : 'Ainda sem avaliações'}</small></div>
      <button onClick={() => setEmpresaAberta(empresa)}>Ver perfil e contactar</button>
    </article>)}</div>
    {empresaAberta && <ModalPerfilEmpresa empresa={empresaAberta} aoFechar={() => setEmpresaAberta(null)} aoActualizar={carregarEmpresas} />}
  </section>;
}

// Este modal é reutilizado nos cartões de viagens para que o cliente possa
// confirmar quem presta o serviço sem abandonar a página em que se encontra.
export function ModalPerfilEmpresa({ empresa, aoFechar, aoActualizar }) {
  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagemEstado, setMensagemEstado] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  async function carregarPerfil() {
    if (!empresa?.slug) return;
    setAProcessar(true); setErro('');
    try { setPerfil(await obterEmpresaPublica(empresa.slug)); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  useEffect(() => { carregarPerfil(); }, [empresa?.slug]);

  async function avaliar(evento) {
    evento.preventDefault(); setAProcessar(true); setErro(''); setMensagemEstado('');
    const formulario = evento.currentTarget;
    try {
      await avaliarEmpresa(perfil.id, Object.fromEntries(new FormData(formulario)));
      await carregarPerfil();
      await aoActualizar?.();
      formulario.reset();
      setMensagemEstado('A sua avaliação foi guardada.');
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function enviarContacto(evento) {
    evento.preventDefault(); setAProcessar(true); setErro(''); setMensagemEstado('');
    const formulario = evento.currentTarget;
    try {
      const ticket = await contactarEmpresa(perfil.id, Object.fromEntries(new FormData(formulario)));
      formulario.reset();
      setMensagemEstado(`Mensagem enviada. O pedido ${ticket.codigo} pode ser acompanhado na página Suporte.`);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  return <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar()}>
    <section className="perfil-publico-empresa vidro" role="dialog" aria-modal="true" aria-label={`Perfil da empresa ${empresa.nome}`}>
      <div className="modal-topo"><div className="identidade-perfil-empresa">{(perfil || empresa).logoUrl ? <img src={`${URL_SERVIDOR}${(perfil || empresa).logoUrl}`} alt={`Logótipo da ${(perfil || empresa).nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<div><p className="etiqueta">Perfil da empresa</p><h2>{(perfil || empresa).nome}</h2>{perfil && <small>{perfil.totalAvaliacoes ? `${perfil.avaliacaoMedia}/5 · ${perfil.totalAvaliacoes} avaliações` : 'Ainda sem avaliações'}</small>}</div></div><button className="fechar-modal" onClick={aoFechar} aria-label="Fechar perfil">×</button></div>
      {aProcessar && !perfil && <p>A carregar informações da empresa...</p>}
      {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
      {mensagemEstado && <p className="mensagem-formulario sucesso" role="status">{mensagemEstado}</p>}
      {perfil && <>
        <p className="descricao-perfil-empresa">{perfil.descricao || 'Esta empresa ainda não adicionou uma descrição.'}</p>
        {(perfil.telefone || perfil.website) && <div className="contactos-publicos-empresa">{perfil.telefone && <span><strong>Telefone</strong>{perfil.telefone}</span>}{perfil.website && <a href={perfil.website} target="_blank" rel="noreferrer"><strong>Website</strong>{perfil.website}</a>}</div>}
        <div className="perfil-empresa-colunas"><div><h3>Próximas viagens</h3><div className="lista-previa-viagens">{perfil.viagens?.length ? perfil.viagens.map((viagem) => <article key={viagem.id}><strong>{viagem.Route?.origin} → {viagem.Route?.destination}</strong><small>{new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(viagem.departureAt))}</small></article>) : <p>Sem partidas futuras neste momento.</p>}</div></div><div><h3>Avaliações recentes</h3><div className="lista-avaliacoes-empresa">{perfil.avaliacoes?.length ? perfil.avaliacoes.map((item) => <article key={item.id}><strong>{item.classificacao}/5 · {item.Autor?.nome || 'Cliente'}</strong><p>{item.comentario || 'Sem comentário.'}</p></article>) : <p>Ainda não existem avaliações.</p>}</div></div></div>
        <form className="formulario-contacto-empresa" onSubmit={enviarContacto}>
          <div><h3>Enviar mensagem à empresa</h3><p>Use este canal para perguntar sobre bagagem, embarque, serviços ou outra preocupação antes da compra.</p></div>
          <label>Assunto<input name="assunto" minLength="5" maxLength="160" required placeholder="Ex.: Política de bagagem" /></label>
          <label>Categoria<select name="categoria" defaultValue="VIAGEM"><option value="VIAGEM">Viagem</option><option value="BILHETE">Bilhete</option><option value="PAGAMENTO">Pagamento</option><option value="RECLAMACAO">Reclamação</option><option value="OUTRO">Outro assunto</option></select></label>
          <label className="mensagem-contacto-empresa">Mensagem<textarea name="mensagem" required maxLength="4000" placeholder="Escreva a sua dúvida ou preocupação" /></label>
          <button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A enviar...' : 'Enviar à empresa'}</button>
          <small>Será criado um pedido rastreável na página Suporte. A prioridade é definida automaticamente pelo sistema.</small>
        </form>
        <form className="formulario-avaliacao-empresa" onSubmit={avaliar}><h3>Avaliar esta empresa</h3><label>Classificação<select name="classificacao" defaultValue="5"><option value="5">5 — Excelente</option><option value="4">4 — Muito boa</option><option value="3">3 — Razoável</option><option value="2">2 — Fraca</option><option value="1">1 — Muito fraca</option></select></label><label>Comentário<textarea name="comentario" maxLength="600" placeholder="Conte como foi a sua experiência" /></label><button className="botao-pesquisar" disabled={aProcessar}>Guardar avaliação</button><small>A avaliação é permitida apenas a clientes com bilhete válido desta empresa.</small></form>
      </>}
    </section>
  </div>;
}
