import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import { URL_SERVIDOR, avaliarEmpresa, listarEmpresas, obterEmpresaPublica } from '../servicos/api.js';

export default function PaginaEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  useEffect(() => { listarEmpresas().then(setEmpresas).catch((falha) => setErro(falha.message)); }, []);

  async function abrir(empresa) {
    setAProcessar(true); setErro('');
    try { setPerfil(await obterEmpresaPublica(empresa.slug)); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function avaliar(evento) {
    evento.preventDefault(); setAProcessar(true); setErro('');
    const formulario = evento.currentTarget;
    try {
      await avaliarEmpresa(perfil.id, Object.fromEntries(new FormData(formulario)));
      setPerfil(await obterEmpresaPublica(perfil.slug));
      setEmpresas(await listarEmpresas());
      formulario.reset();
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  return <section className="pagina-empresas-cliente">
    <div className="titulo-secao titulo-catalogo-empresas"><div><p className="etiqueta">Empresas de transporte</p><h3>Conheça quem realiza as viagens</h3><p>Consulte o perfil, próximas partidas e avaliações de outros clientes.</p></div></div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    <div className="grelha-empresas-cliente">{empresas.map((empresa) => <article className="cartao-empresa-cliente vidro" key={empresa.id}>
      {empresa.logoUrl ? <img src={`${URL_SERVIDOR}${empresa.logoUrl}`} alt={`Logótipo da ${empresa.nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}
      <div><h3>{empresa.nome}</h3><p>{empresa.descricao || 'Empresa de transporte registada na plataforma.'}</p><small>{empresa.totalAvaliacoes ? `${empresa.avaliacaoMedia}/5 em ${empresa.totalAvaliacoes} avaliações` : 'Ainda sem avaliações'}</small></div>
      <button onClick={() => abrir(empresa)} disabled={aProcessar}>Ver perfil</button>
    </article>)}</div>
    {perfil && <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && setPerfil(null)}><section className="perfil-publico-empresa vidro" role="dialog" aria-modal="true">
      <div className="modal-topo"><div className="identidade-perfil-empresa">{perfil.logoUrl ? <img src={`${URL_SERVIDOR}${perfil.logoUrl}`} alt="" /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<div><p className="etiqueta">Perfil da empresa</p><h2>{perfil.nome}</h2><small>{perfil.totalAvaliacoes ? `${perfil.avaliacaoMedia}/5 · ${perfil.totalAvaliacoes} avaliações` : 'Ainda sem avaliações'}</small></div></div><button className="fechar-modal" onClick={() => setPerfil(null)}>×</button></div>
      <p className="descricao-perfil-empresa">{perfil.descricao || 'Esta empresa ainda não adicionou uma descrição.'}</p>
      <div className="perfil-empresa-colunas"><div><h3>Próximas viagens</h3><div className="lista-previa-viagens">{perfil.viagens?.length ? perfil.viagens.map((viagem) => <article key={viagem.id}><strong>{viagem.Route?.origin} → {viagem.Route?.destination}</strong><small>{new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(viagem.departureAt))}</small></article>) : <p>Sem partidas futuras neste momento.</p>}</div></div><div><h3>Avaliações recentes</h3><div className="lista-avaliacoes-empresa">{perfil.avaliacoes?.length ? perfil.avaliacoes.map((item) => <article key={item.id}><strong>{item.classificacao}/5 · {item.Autor?.nome || 'Cliente'}</strong><p>{item.comentario || 'Sem comentário.'}</p></article>) : <p>Ainda não existem avaliações.</p>}</div></div></div>
      <form className="formulario-avaliacao-empresa" onSubmit={avaliar}><h3>Avaliar esta empresa</h3><label>Classificação<select name="classificacao" defaultValue="5"><option value="5">5 — Excelente</option><option value="4">4 — Muito boa</option><option value="3">3 — Razoável</option><option value="2">2 — Fraca</option><option value="1">1 — Muito fraca</option></select></label><label>Comentário<textarea name="comentario" maxLength="600" placeholder="Conte como foi a sua experiência" /></label><button className="botao-pesquisar" disabled={aProcessar}>Guardar avaliação</button><small>A avaliação é permitida apenas a clientes com bilhete válido desta empresa.</small></form>
    </section></div>}
  </section>;
}
