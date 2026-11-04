import { useEffect, useState } from 'react';
import Icone from './componentes/Icone.jsx';
import PainelAdministrador from './componentes/PainelAdministrador.jsx';
import PainelSuporte from './componentes/PainelSuporte.jsx';
import PaginaSuportePassageiro from './componentes/PaginaSuportePassageiro.jsx';
import MapaAssentos from './componentes/MapaAssentos.jsx';
import SelecaoLocalidade from './componentes/SelecaoLocalidade.jsx';
import PaginaContaUtilizador from './componentes/PaginaContaUtilizador.jsx';
import PaginaEmpresas from './componentes/PaginaEmpresas.jsx';
import PaginaValidacaoBilhete from './componentes/PaginaValidacaoBilhete.jsx';
import { ModalConfirmacao } from './componentes/Modal.jsx';
import { URL_SERVIDOR, cancelarBilhete, comprarBilhete, confirmarRecuperacaoPalavraPasse, confirmarRegistoUtilizador, guardarSessao, iniciarPagamentoSimulado, iniciarSessao, obterBilhetePdf, obterPerfil, obterResumoConta, obterSessaoGuardada, pesquisarViagens, processarPagamentoSimulado, registarUtilizador, solicitarRecuperacaoPalavraPasse, terminarSessao, validarCupao } from './servicos/api.js';
import useSelecaoAssentosTempoReal from './hooks/useSelecaoAssentosTempoReal.js';
import { formatarValor } from './utilitarios/moeda.js';
import { normalizarLocalizacaoHabitual, obterDataHojeMaputo } from './utilitarios/viagens-inicio.js';
import { extrairCodigoValidacaoBilhete } from './utilitarios/validacao-bilhete.js';

const itensMenu = [
  ['inicio', 'Início'], ['viagens', 'Minhas Viagens'], ['bilhete', 'Bilhetes'],
  ['cartao', 'Pagamentos'], ['autocarro', 'Empresas'], ['suporte', 'Suporte'], ['utilizador', 'Perfil']
];

export default function App() {
  const codigoValidacao = extrairCodigoValidacaoBilhete(window.location.pathname);
  if (codigoValidacao) return <PaginaValidacaoBilhete codigo={codigoValidacao} />;
  return <AplicacaoPrincipal />;
}

function AplicacaoPrincipal() {
  const [sessao, setSessao] = useState(() => obterSessaoGuardada());
  const [aVerificarSessao, setAVerificarSessao] = useState(Boolean(obterSessaoGuardada()));
  const [menuAberto, setMenuAberto] = useState(false);
  const [paginaAtiva, setPaginaAtiva] = useState('Início');
  const [novaViagemAberta, setNovaViagemAberta] = useState(null);
  const [resumoConta, setResumoConta] = useState(null);
  const [erroConta, setErroConta] = useState('');
  const [versaoConta, setVersaoConta] = useState(0);

  useEffect(() => {
    if (!sessao?.token) { setAVerificarSessao(false); return; }
    obterPerfil()
      .then((utilizador) => {
        const sessaoActualizada = { ...sessao, utilizador };
        guardarSessao(sessaoActualizada);
        setSessao(sessaoActualizada);
      })
      .catch(() => {
        terminarSessao();
        setSessao(null);
      })
      .finally(() => setAVerificarSessao(false));
  }, [sessao?.token]);

  useEffect(() => {
    if (!sessao?.token || sessao.utilizador?.perfil !== 'PASSAGEIRO') return;
    setErroConta('');
    obterResumoConta().then(setResumoConta).catch((erro) => setErroConta(erro.message));
  }, [sessao?.token, versaoConta]);

  function selecionarPagina(nome) {
    setPaginaAtiva(nome);
    setMenuAberto(false);
  }

  function concluirAutenticacao(novaSessao) {
    guardarSessao(novaSessao);
    setSessao(novaSessao);
    setAVerificarSessao(false);
  }

  function sair() {
    terminarSessao();
    setSessao(null);
    setPaginaAtiva('Início');
  }

  function actualizarConta() {
    setVersaoConta((versao) => versao + 1);
  }

  function abrirPesquisaViagens() {
    selecionarPagina('Início');
    requestAnimationFrame(() => document.querySelector('.formulario-pesquisa-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  function actualizarUtilizadorSessao(novoUtilizador) {
    const sessaoActualizada = { ...sessao, utilizador: novoUtilizador };
    guardarSessao(sessaoActualizada);
    setSessao(sessaoActualizada);
  }

  if (aVerificarSessao) {
    return <div className="estado-carregamento"><span className="marca-carregamento"><Icone nome="autocarro" /></span><p>A preparar a sua conta...</p></div>;
  }

  if (!sessao) {
    return <PaginaAutenticacao aoAutenticar={concluirAutenticacao} />;
  }

  const utilizador = sessao.utilizador;
  const primeiroNome = utilizador.nome.split(' ')[0];

  if (['ADMIN', 'EMPRESA_ADMIN'].includes(utilizador.perfil)) {
    return <PainelAdministrador utilizador={utilizador} aoSair={sair} aoActualizarUtilizador={actualizarUtilizadorSessao} />;
  }
  if (utilizador.perfil === 'GESTOR_SUPORTE') {
    return <PainelSuporte utilizador={utilizador} aoSair={sair} aoActualizarUtilizador={actualizarUtilizadorSessao} />;
  }

  return (
    <div className="aplicacao">
      <div className="orbita orbita-um" /><div className="orbita orbita-dois" />
      <button className="botao-menu" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu"><Icone nome="menu" /></button>

      <aside className={`barra-lateral vidro ${menuAberto ? 'aberta' : ''}`}>
        <div className="logotipo">
          <span className="logotipo-icone"><Icone nome="autocarro" /></span>
          <div><strong>Viagem Bus</strong><small>Mais destinos, mais histórias</small></div>
        </div>
        <nav aria-label="Navegação principal">
          {itensMenu.map(([icone, nome]) => (
            <button key={nome} className={paginaAtiva === nome ? 'ativo' : ''} onClick={() => selecionarPagina(nome)}>
              <Icone nome={icone} /><span>{nome}</span>
            </button>
          ))}
        </nav>
        <div className="lateral-rodape"><Icone nome="escudo" /><span>Ambiente seguro</span></div>
        {/* Em ecrãs menores, esta alternativa mantém a saída acessível dentro do menu lateral. */}
        <button className="botao-sair-lateral" onClick={sair}>Terminar sessão</button>
      </aside>
      {menuAberto && <button className="fundo-menu" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}

      <main className="conteudo">
        <div className="topo">
          <div className="marca-topo-mobile" aria-label="Viagem Bus">
            <span className="logotipo-icone"><Icone nome="autocarro" /></span>
            <strong>Viagem Bus</strong>
          </div>
          <label className="pesquisa vidro"><Icone nome="pesquisa" /><input readOnly onFocus={abrirPesquisaViagens} placeholder="Pesquisar rotas, cidades ou viagens..." aria-label="Ir para a pesquisa de viagens" /></label>
          <div className="perfil-topo">
            <button className="botao-circular vidro" aria-label="Notificações"><Icone nome="sino" /></button>
            <span className="avatar">{primeiroNome.charAt(0).toUpperCase()}</span><strong>{primeiroNome}</strong><button className="botao-sair" onClick={sair}>Sair</button>
          </div>
        </div>

        {erroConta && <p className="mensagem-formulario erro" role="alert">{erroConta}</p>}
        {!resumoConta ? <div className="painel-carregando vidro">A carregar os dados da sua conta...</div> :
          <ConteudoConta pagina={paginaAtiva} resumo={resumoConta} utilizador={utilizador} aoNovaViagem={() => setNovaViagemAberta(true)} aoEscolherViagem={(viagem) => setNovaViagemAberta({ viagem })} aoAbrirSuporte={() => selecionarPagina('Suporte')} aoActualizar={actualizarConta} aoActualizarUtilizador={actualizarUtilizadorSessao} />}
      </main>
      <nav className="navegacao-inferior-mobile vidro" aria-label="Navegação rápida">
        {[
          ['inicio', 'Início'],
          ['bilhete', 'Bilhetes'],
          ['suporte', 'Suporte'],
          ['utilizador', 'Perfil']
        ].map(([icone, nome]) => <button key={nome} className={paginaAtiva === nome ? 'ativo' : ''} onClick={() => selecionarPagina(nome)}><Icone nome={icone} /><span>{nome}</span></button>)}
      </nav>
      <button className="botao-flutuante" onClick={() => setNovaViagemAberta(true)} aria-label="Comprar bilhete para uma nova viagem">+</button>
      {novaViagemAberta && <FluxoCompra utilizador={utilizador} viagemInicial={novaViagemAberta?.viagem} aoFechar={() => setNovaViagemAberta(null)} aoComprar={actualizarConta} />}
    </div>
  );
}

function ConteudoConta({ pagina, resumo, utilizador, aoNovaViagem, aoEscolherViagem, aoAbrirSuporte, aoActualizar, aoActualizarUtilizador }) {
  if (pagina === 'Perfil') return <PaginaContaUtilizador utilizador={utilizador} aoActualizarUtilizador={aoActualizarUtilizador} />;
  if (pagina === 'Empresas') return <PaginaEmpresas />;
  if (pagina === 'Suporte') return <PaginaSuportePassageiro />;
  if (pagina === 'Pagamentos') return <PaginaPagamentos pagamentos={resumo.pagamentos} />;
  if (pagina === 'Bilhetes') return <PaginaBilhetes bilhetes={resumo.bilhetes} aoActualizar={aoActualizar} />;
  if (pagina === 'Minhas Viagens') return <PaginaViagens viagens={resumo.bilhetes} aoActualizar={aoActualizar} />;
  return <PaginaInicio resumo={resumo} aoNovaViagem={aoNovaViagem} aoEscolherViagem={aoEscolherViagem} aoAbrirSuporte={aoAbrirSuporte} aoActualizar={aoActualizar} />;
}

function PaginaInicio({ resumo, aoNovaViagem, aoEscolherViagem, aoAbrirSuporte, aoActualizar }) {
  const proxima = resumo.proximaViagem;
  return <div className="inicio-passageiro">
    {proxima ? <section className="proxima-viagem" aria-label="Próxima viagem">
      <div className="viagem-conteudo">
        <div className="linha-estado"><span>Próxima viagem</span><span className="confirmado"><Icone nome="confirmado" /> Confirmado</span></div>
        <h3>{proxima.viagem.origem} <span>→</span> {proxima.viagem.destino}</h3><p className="empresa-viagem">{proxima.viagem.empresa?.logoUrl && <img src={`${URL_SERVIDOR}${proxima.viagem.empresa.logoUrl}`} alt="" />}{proxima.viagem.empresa?.nome}</p>
        <div className="detalhes-viagem">
          <div><Icone nome="calendario" /><span><strong>{formatarData(proxima.viagem.partidaEm)}</strong><small>Data da viagem</small></span></div>
          <div><Icone nome="relogio" /><span><strong>{formatarHora(proxima.viagem.partidaEm)}</strong><small>Partida</small></span></div>
          <div><Icone nome="assento" /><span><strong>Assento {proxima.assento?.numero}</strong><small>{proxima.codigo}</small></span></div>
        </div>
        <div className="acoes-viagem"><BotaoPdfBilhete codigo={proxima.codigo} className="botao-claro" texto="Descarregar bilhete" /><button className="botao-secundario" onClick={aoNovaViagem}>Comprar outro bilhete</button></div>
      </div><div className="arte-autocarro" aria-hidden="true"><img src="/imagens/autocarro-proxima-viagem.png" alt="" decoding="async" /></div>
    </section> : <section className="hero-compra-passageiro">
      <div><p className="etiqueta">Viagens seguras e simples</p><h1>Encontre a sua próxima viagem</h1><p>Compare empresas, horários e preços antes de escolher o seu bilhete.</p><button className="botao-nova-viagem" onClick={aoNovaViagem}><Icone nome="bilhete" /> Comprar bilhete</button></div>
      <span className="hero-autocarro" aria-hidden="true"><Icone nome="autocarroGrande" /></span>
    </section>}

    <PesquisaViagensInicio aoEscolherViagem={aoEscolherViagem} />
  </div>;
}

function ListaViagensRecentes({ bilhetes, aoActualizar }) {
  const [bilheteACancelar, setBilheteACancelar] = useState(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');
  async function cancelar() {
    setAProcessar(true); setErro('');
    try { await cancelarBilhete(bilheteACancelar.codigo); setBilheteACancelar(null); aoActualizar(); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }
  return <section className="historico viagens-recentes-cartoes vidro"><div className="titulo-secao"><h3>Viagens recentes</h3><span>{bilhetes.length} registos</span></div><div className="lista-cartoes-viagem-recente">{bilhetes.length ? bilhetes.map((item) => <article key={item.codigo}>
    <div className="topo-cartao-viagem-recente"><span className="data-cartao-viagem"><strong>{item.viagem ? formatarData(item.viagem.partidaEm) : '—'}</strong><small>{item.viagem ? formatarHora(item.viagem.partidaEm) : ''}</small></span><b className={`estado-bilhete estado-${item.estado.toLowerCase()}`}>{traduzirEstado(item.estado)}</b></div>
    <div className="empresa-cartao-viagem">{item.viagem?.empresa?.logoUrl ? <img src={`${URL_SERVIDOR}${item.viagem.empresa.logoUrl}`} alt="" /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<div><strong>{item.viagem?.origem} → {item.viagem?.destino}</strong><small>{item.viagem?.empresa?.nome || 'Empresa de transporte'}</small></div></div>
    <div className="detalhes-cartao-viagem"><span><small>Bilhete</small><strong>{item.codigo}</strong></span><span><small>Assento</small><strong>{item.assento?.numero || '—'}</strong></span><span><small>Valor</small><strong>{formatarMeticais(item.preco)}</strong></span></div>
    <footer><BotaoPdfBilhete codigo={item.codigo} texto="Abrir PDF" />{['EMITIDO', 'RESERVADO'].includes(item.estado) && item.viagem && new Date(item.viagem.partidaEm) > new Date() && <button className="botao-cancelar" onClick={() => setBilheteACancelar(item)}>Cancelar</button>}</footer>
  </article>) : <EstadoVazio texto="Ainda não existem viagens nesta conta." />}</div>{erro && <p className="mensagem-formulario erro">{erro}</p>}{bilheteACancelar && <ModalConfirmacao titulo="Cancelar bilhete" texto={`Deseja cancelar o bilhete ${bilheteACancelar.codigo}?`} textoConfirmar="Cancelar bilhete" perigo aProcessar={aProcessar} aoConfirmar={cancelar} aoFechar={() => setBilheteACancelar(null)} />}</section>;
}

function PesquisaViagensInicio({ aoEscolherViagem }) {
  const [localizacao, setLocalizacao] = useState(() => {
    try { return normalizarLocalizacaoHabitual(JSON.parse(localStorage.getItem('viagemBus.localizacaoHabitual'))); }
    catch { return null; }
  });
  const [viagens, setViagens] = useState([]);
  const [tituloResultados, setTituloResultados] = useState('Viagens próximas de si');
  const [aPesquisar, setAPesquisar] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setAPesquisar(true);
    const filtros = localizacao
      ? { origemProvincia: localizacao.provincia, origem: localizacao.cidade, limite: 12 }
      : { limite: 12 };
    pesquisarViagens(filtros)
      .then((resultados) => { setViagens(resultados); setTituloResultados(localizacao ? `Próximas partidas de ${localizacao.cidade}` : 'Viagens de hoje e dos próximos dias'); })
      .catch((falha) => setErro(falha.message))
      .finally(() => setAPesquisar(false));
  // As recomendações automáticas são carregadas ao abrir a página. Depois de
  // uma pesquisa manual, preservamos os resultados escolhidos pelo cliente.
  }, []);

  async function pesquisar(evento) {
    evento.preventDefault(); setAPesquisar(true); setErro('');
    const filtros = Object.fromEntries(new FormData(evento.currentTarget));
    if (localidadesIguais(filtros)) { setErro('A origem e o destino devem ser diferentes.'); setAPesquisar(false); return; }
    const habitual = normalizarLocalizacaoHabitual({ provincia: filtros.origemProvincia, cidade: filtros.origem });
    try {
      const resultados = await pesquisarViagens(filtros);
      setViagens(resultados); setTituloResultados('Resultados da pesquisa');
      if (habitual) {
        localStorage.setItem('viagemBus.localizacaoHabitual', JSON.stringify(habitual));
        setLocalizacao(habitual);
      }
    } catch (falha) { setErro(falha.message); }
    finally { setAPesquisar(false); }
  }

  return <section className="pesquisa-inicio">
    <div className="titulo-secao"><div><p className="etiqueta">Encontre a sua próxima viagem</p><h3>Para onde deseja viajar?</h3><p>A origem fica guardada neste dispositivo para mostrarmos partidas da sua localização.</p></div>{localizacao && <span className="localizacao-habitual"><Icone nome="localizacao" /> {localizacao.cidade}</span>}</div>
    <form className="formulario-pesquisa-inicio vidro" onSubmit={pesquisar}>
      <div className="direcao-pesquisa"><Icone nome="autocarro" /><strong>De <span>→</span> Para</strong></div>
      <SelecaoLocalidade compacto prefixo="origem" titulo="Origem" valorInicialProvincia={localizacao?.provincia} valorInicialCidade={localizacao?.cidade} />
      <SelecaoLocalidade compacto prefixo="destino" titulo="Destino" />
      <label>Data da viagem <small>Opcional</small><input name="data" type="date" min={obterDataHojeMaputo()} /></label>
      <button className="botao-pesquisar" disabled={aPesquisar}><Icone nome="pesquisa" /> {aPesquisar ? 'A pesquisar...' : 'Pesquisar'}</button>
    </form>
    {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
    <div className="cabecalho-recomendacoes"><div><span className="marcador-titulo" /><h3>{tituloResultados}</h3></div>{localizacao && <small>Ordenadas pela partida mais próxima</small>}</div>
    {viagens.length === 0 && !aPesquisar ? <EstadoVazio texto="Não existem partidas futuras disponíveis." /> : <div className="lista-viagens-inicio">{viagens.map((item) => <article className="opcao-viagem vidro" key={item.id}>
      <header className="empresa-opcao-viagem">{item.Empresa?.logoUrl ? <img src={`${URL_SERVIDOR}${item.Empresa.logoUrl}`} alt={`Logótipo da ${item.Empresa.nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<strong>{item.Empresa?.nome || 'Empresa de transporte'}</strong></header>
      <div className="rota-opcao-viagem"><strong>{item.Route?.origin} <span>→</span> {item.Route?.destination}</strong></div>
      <div className="horario-opcao-viagem"><span><Icone nome="calendario" /> {formatarData(item.departureAt)}</span><span><Icone nome="relogio" /> {formatarHora(item.departureAt)}</span></div>
      <footer><div className="preco-viagem"><small>Preço por passageiro</small><strong>{formatarMeticais(item.price)}</strong></div><button onClick={() => aoEscolherViagem(item)}><Icone nome="bilhete" /> Comprar</button></footer>
    </article>)}</div>}
  </section>;
}

function PaginaViagens({ viagens, aoActualizar }) {
  return <section className="pagina-dados vidro"><div className="titulo-secao"><div><p className="etiqueta">Histórico</p><h3>Minhas viagens</h3></div><span>{viagens.length} registos</span></div><TabelaBilhetes bilhetes={viagens} aoActualizar={aoActualizar} semMoldura /></section>;
}

function PaginaBilhetes({ bilhetes, aoActualizar }) {
  return <section className="pagina-dados vidro"><div className="titulo-secao"><div><p className="etiqueta">Documentos eletrónicos</p><h3>Meus bilhetes</h3></div><span>{bilhetes.length} bilhetes</span></div><TabelaBilhetes bilhetes={bilhetes} aoActualizar={aoActualizar} semMoldura /></section>;
}

function TabelaBilhetes({ titulo, bilhetes, aoActualizar, semMoldura = false }) {
  const [codigoEmCurso, setCodigoEmCurso] = useState('');
  const [erro, setErro] = useState('');
  const [bilheteACancelar, setBilheteACancelar] = useState(null);

  async function cancelar() {
    if (!bilheteACancelar) return;
    setCodigoEmCurso(bilheteACancelar.codigo);
    setErro('');
    try { await cancelarBilhete(bilheteACancelar.codigo); setBilheteACancelar(null); aoActualizar(); }
    catch (falha) { setErro(falha.message); }
    finally { setCodigoEmCurso(''); }
  }

  const conteudo = <>
    {titulo && <div className="titulo-secao"><h3>{titulo}</h3></div>}
    <div className="tabela-cabecalho"><span>Data</span><span>Origem → Destino</span><span>Assento</span><span>Estado</span><span>Ações</span></div>
    <div className="linhas-viagem">{bilhetes.length === 0 ? <EstadoVazio texto="Ainda não existem viagens nesta conta." /> : bilhetes.map((item) => <div className="linha-viagem" key={item.codigo}>
      <span data-label="Data">{item.viagem ? formatarData(item.viagem.partidaEm) : '—'}</span><span data-label="Rota">{item.viagem ? `${item.viagem.origem} → ${item.viagem.destino}${item.viagem.empresa?.nome ? ` · ${item.viagem.empresa.nome}` : ''}` : '—'}</span><span data-label="Assento">{item.assento?.numero || '—'}</span><span data-label="Estado"><b className={`estado-bilhete estado-${item.estado.toLowerCase()}`}>{traduzirEstado(item.estado)}</b></span><span data-label="Ação" className="acoes-linha"><BotaoPdfBilhete codigo={item.codigo} />{['EMITIDO', 'RESERVADO'].includes(item.estado) && item.viagem && new Date(item.viagem.partidaEm) > new Date() && <button className="botao-cancelar" disabled={codigoEmCurso === item.codigo} onClick={() => setBilheteACancelar(item)}>Cancelar</button>}</span>
    </div>)}</div>{erro && <p className="mensagem-formulario erro">{erro}</p>}
    {bilheteACancelar && <ModalConfirmacao titulo="Cancelar bilhete" texto={`Deseja cancelar o bilhete ${bilheteACancelar.codigo}? O pagamento ficará marcado como reembolsado nesta simulação.`} textoConfirmar="Cancelar bilhete" perigo aProcessar={Boolean(codigoEmCurso)} aoConfirmar={cancelar} aoFechar={() => setBilheteACancelar(null)} />}
  </>;
  return semMoldura ? conteudo : <div className="historico vidro">{conteudo}</div>;
}

function PaginaPagamentos({ pagamentos }) {
  return <section className="pagina-dados vidro"><div className="titulo-secao"><div><p className="etiqueta">Movimentos</p><h3>Pagamentos</h3></div><span>{pagamentos.length} registos</span></div><div className="lista-pagamentos">{pagamentos.length === 0 ? <EstadoVazio texto="Ainda não existem pagamentos nesta conta." /> : pagamentos.map((item) => <article key={item.referencia}><span className="resumo-icone"><Icone nome="cartao" /></span><div><strong>{nomeMetodoPagamento(item.metodo)}</strong><small>{item.referencia} · Bilhete {item.bilheteCodigo}</small></div><div className="valor-pagamento"><strong>{formatarMeticais(item.valor)}</strong><small>{item.criadoEm ? formatarData(item.criadoEm) : ''}</small></div><b className={`estado-bilhete estado-${item.estado.toLowerCase()}`}>{traduzirEstado(item.estado)}</b></article>)}</div></section>;
}

function EstadoVazio({ texto }) {
  return <div className="estado-vazio estado-vazio-lista"><Icone nome="bilhete" /><strong>{texto}</strong></div>;
}

function CartaoResumo({ icone, titulo, valor, detalhe }) {
  return <article className="cartao-resumo vidro"><span className="resumo-icone"><Icone nome={icone} /></span><div><small>{titulo}</small><strong>{valor}</strong><p>{detalhe}</p></div><Icone nome="seta" /></article>;
}

function PaginaAutenticacao({ aoAutenticar }) {
  const [modo, setModo] = useState('entrar');
  const [etapaRegisto, setEtapaRegisto] = useState('dados');
  const [registoPendente, setRegistoPendente] = useState(null);
  const [etapaRecuperacao, setEtapaRecuperacao] = useState('telefone');
  const [recuperacaoPendente, setRecuperacaoPendente] = useState(null);
  const [mostrarPalavraPasse, setMostrarPalavraPasse] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('erro');

  async function submeter(evento) {
    evento.preventDefault();
    setAProcessar(true);
    setMensagem('');
    const dados = Object.fromEntries(new FormData(evento.currentTarget));

    try {
      if (modo === 'registar' && etapaRegisto === 'dados') {
        const pendente = await registarUtilizador(dados);
        setRegistoPendente({ ...pendente, dadosOriginais: dados });
        setEtapaRegisto('otp');
        setTipoMensagem('sucesso');
        setMensagem(`Código enviado por ${pendente.canal === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} para ${pendente.telefone}.`);
      } else if (modo === 'registar') {
        await confirmarRegistoUtilizador({ telefone: registoPendente.telefone, codigo: dados.codigo });
        setModo('entrar'); setEtapaRegisto('dados'); setRegistoPendente(null);
        setTipoMensagem('sucesso');
        setMensagem('Número confirmado e conta criada. Já pode iniciar sessão.');
      } else if (modo === 'recuperar' && etapaRecuperacao === 'telefone') {
        const pendente = await solicitarRecuperacaoPalavraPasse(dados);
        setRecuperacaoPendente({ ...pendente, dadosOriginais: dados });
        setEtapaRecuperacao('otp');
        setTipoMensagem('sucesso');
        setMensagem('Se o número estiver registado, receberá um código de recuperação.');
      } else if (modo === 'recuperar') {
        if (dados.novaPalavraPasse !== dados.confirmarPalavraPasse) throw new Error('As palavras-passe não coincidem.');
        await confirmarRecuperacaoPalavraPasse({
          telefone: recuperacaoPendente.telefone,
          codigo: dados.codigo,
          novaPalavraPasse: dados.novaPalavraPasse
        });
        setModo('entrar'); setEtapaRecuperacao('telefone'); setRecuperacaoPendente(null);
        setTipoMensagem('sucesso'); setMensagem('Palavra-passe redefinida. Já pode iniciar sessão.');
      } else {
        const novaSessao = await iniciarSessao(dados);
        aoAutenticar(novaSessao);
      }
    } catch (erro) {
      setTipoMensagem('erro');
      setMensagem(erro.message);
    } finally {
      setAProcessar(false);
    }
  }

  function mudarModo(novoModo) {
    setModo(novoModo);
    setMensagem('');
    setMostrarPalavraPasse(false);
    setEtapaRegisto('dados');
    setRegistoPendente(null);
    setEtapaRecuperacao('telefone');
    setRecuperacaoPendente(null);
  }

  async function reenviarCodigo() {
    setAProcessar(true); setMensagem('');
    try {
      if (modo === 'recuperar') {
        const pendente = await solicitarRecuperacaoPalavraPasse(recuperacaoPendente.dadosOriginais);
        setRecuperacaoPendente((actual) => ({ ...actual, ...pendente }));
      } else {
        const pendente = await registarUtilizador(registoPendente.dadosOriginais);
        setRegistoPendente((actual) => ({ ...actual, ...pendente }));
      }
      setTipoMensagem('sucesso'); setMensagem('Foi enviado um novo código de confirmação.');
    } catch (erro) { setTipoMensagem('erro'); setMensagem(erro.message); }
    finally { setAProcessar(false); }
  }

  return <main className="pagina-autenticacao">
    <div className="orbita orbita-um" /><div className="orbita orbita-dois" />
    <section className="apresentacao-autenticacao">
      <span className="marca-autenticacao"><Icone nome="autocarro" /></span>
      <p className="etiqueta">Viagem Bus</p>
      <h1>Mais destinos,<br />mais histórias.</h1>
      <p>Compre o seu bilhete, escolha o assento e acompanhe todas as viagens num único lugar.</p>
      <div className="vantagens-autenticacao"><span><Icone nome="escudo" /> Compra segura</span><span><Icone nome="bilhete" /> Bilhete eletrónico</span><span><Icone nome="confirmado" /> Confirmação imediata</span></div>
    </section>
    <section className="cartao-autenticacao vidro">
      <div className="abas-autenticacao" role="tablist">
        <button className={modo === 'entrar' ? 'ativa' : ''} onClick={() => mudarModo('entrar')}>Iniciar sessão</button>
        <button className={modo === 'registar' ? 'ativa' : ''} onClick={() => mudarModo('registar')}>Criar conta</button>
      </div>
      <div className="titulo-autenticacao"><h2>{modo === 'entrar' ? 'Bem-vindo de volta' : modo === 'recuperar' ? etapaRecuperacao === 'otp' ? 'Defina uma nova palavra-passe' : 'Recupere o acesso' : etapaRegisto === 'otp' ? 'Confirme o seu número' : 'Crie a sua conta'}</h2><p>{modo === 'entrar' ? 'Introduza o telefone e a palavra-passe.' : modo === 'recuperar' ? etapaRecuperacao === 'otp' ? `Introduza o código enviado para ${recuperacaoPendente?.telefone}.` : 'Receba um código no número associado à sua conta.' : etapaRegisto === 'otp' ? `Introduza o código de 6 dígitos enviado para ${registoPendente?.telefone}.` : 'Não é necessário apresentar documento pessoal.'}</p></div>
      <form className="formulario-autenticacao" onSubmit={submeter}>
        {modo === 'registar' && etapaRegisto === 'dados' && <div className="linha-nome-registo"><label>Nome<input name="nome" autoComplete="given-name" minLength="2" maxLength="80" required /></label><label>Apelido<input name="apelido" autoComplete="family-name" minLength="2" maxLength="120" required /></label></div>}
        {(modo === 'entrar' || (modo === 'registar' && etapaRegisto === 'dados') || (modo === 'recuperar' && etapaRecuperacao === 'telefone')) && <label>Número de telefone<input name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="84 000 0000" required /></label>}
        {((modo === 'registar' && etapaRegisto === 'dados') || (modo === 'recuperar' && etapaRecuperacao === 'telefone')) && <label>Receber código por<select name="canal" defaultValue="WHATSAPP"><option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option></select></label>}
        {(modo === 'entrar' || (modo === 'registar' && etapaRegisto === 'dados')) && <label>Palavra-passe<div className="campo-palavra-passe"><input name="palavraPasse" type={mostrarPalavraPasse ? 'text' : 'password'} minLength="8" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required /><button type="button" onClick={() => setMostrarPalavraPasse((visivel) => !visivel)} aria-label={mostrarPalavraPasse ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} title={mostrarPalavraPasse ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}><Icone nome={mostrarPalavraPasse ? 'olhoFechado' : 'olho'} /></button></div></label>}
        {modo === 'entrar' && <button className="botao-recuperar-senha" type="button" onClick={() => mudarModo('recuperar')}>Esqueci a palavra-passe</button>}
        {modo === 'registar' && etapaRegisto === 'otp' && <><label>Código de confirmação<input className="campo-otp" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required /></label>{registoPendente?.codigoDemonstracao && <p className="codigo-demonstracao">Código de demonstração: <strong>{registoPendente.codigoDemonstracao}</strong></p>}</>}
        {modo === 'recuperar' && etapaRecuperacao === 'otp' && <><label>Código de recuperação<input className="campo-otp" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required /></label>{recuperacaoPendente?.codigoDemonstracao && <p className="codigo-demonstracao">Código de demonstração: <strong>{recuperacaoPendente.codigoDemonstracao}</strong></p>}<label>Nova palavra-passe<div className="campo-palavra-passe"><input name="novaPalavraPasse" type={mostrarPalavraPasse ? 'text' : 'password'} minLength="8" autoComplete="new-password" required /><button type="button" onClick={() => setMostrarPalavraPasse((visivel) => !visivel)} aria-label={mostrarPalavraPasse ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}><Icone nome={mostrarPalavraPasse ? 'olhoFechado' : 'olho'} /></button></div></label><label>Confirmar nova palavra-passe<input name="confirmarPalavraPasse" type={mostrarPalavraPasse ? 'text' : 'password'} minLength="8" autoComplete="new-password" required /></label></>}
        {mensagem && <p className={`mensagem-formulario ${tipoMensagem}`} role="status">{mensagem}</p>}
        <button className="botao-autenticacao" disabled={aProcessar}>{aProcessar ? 'A processar...' : modo === 'entrar' ? 'Entrar na minha conta' : modo === 'recuperar' ? etapaRecuperacao === 'otp' ? 'Redefinir palavra-passe' : 'Enviar código de recuperação' : etapaRegisto === 'otp' ? 'Confirmar e criar conta' : 'Enviar código de confirmação'}</button>
        {modo === 'registar' && etapaRegisto === 'otp' && <div className="acoes-otp"><button type="button" onClick={() => { setEtapaRegisto('dados'); setMensagem(''); }}>Corrigir dados</button><button type="button" onClick={reenviarCodigo} disabled={aProcessar}>Reenviar código</button></div>}
        {modo === 'recuperar' && <div className="acoes-otp"><button type="button" onClick={() => mudarModo('entrar')}>Voltar ao início de sessão</button>{etapaRecuperacao === 'otp' && <button type="button" onClick={reenviarCodigo} disabled={aProcessar}>Reenviar código</button>}</div>}
      </form>
      <p className="nota-seguranca"><Icone nome="escudo" /> Os seus dados são protegidos e utilizados apenas para gerir as viagens.</p>
    </section>
  </main>;
}

function FluxoCompra({ utilizador, viagemInicial, aoFechar, aoComprar }) {
  const [etapa, setEtapa] = useState(viagemInicial ? 'assentos' : 'pesquisa');
  const [viagens, setViagens] = useState([]);
  const [viagem, setViagem] = useState(viagemInicial || null);
  const [metodoPagamento, setMetodoPagamento] = useState('MPESA');
  const [bilhete, setBilhete] = useState(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');
  const [transacaoPagamento, setTransacaoPagamento] = useState(null);
  const [mensagemProcessamento, setMensagemProcessamento] = useState('A contactar o serviço de pagamento...');
  const [codigoCupao, setCodigoCupao] = useState('');
  const [cupaoAplicado, setCupaoAplicado] = useState(null);
  const [aValidarCupao, setAValidarCupao] = useState(false);
  const { assentos, assentoId, aReservar, seleccionar: seleccionarAssento, libertar: libertarAssento, actualizar: actualizarAssentos } = useSelecaoAssentosTempoReal(viagem?.id, setErro);

  async function pesquisar(evento) {
    evento.preventDefault();
    setAProcessar(true);
    setErro('');
    try {
      const filtros = Object.fromEntries(new FormData(evento.currentTarget));
      if (localidadesIguais(filtros)) throw new Error('A origem e o destino devem ser diferentes.');
      const resultados = await pesquisarViagens(filtros);
      setViagens(resultados);
      setEtapa('resultados');
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function escolherViagem(seleccionada) {
    setErro('');
    setViagem(seleccionada);
    setCodigoCupao(''); setCupaoAplicado(null);
    setEtapa('assentos');
  }

  async function aplicarCupao() {
    setErro('');
    if (!codigoCupao.trim()) { setCupaoAplicado(null); return; }
    setAValidarCupao(true);
    try {
      const resumo = await validarCupao({ viagemId: viagem.id, codigo: codigoCupao });
      setCupaoAplicado(resumo);
      setCodigoCupao(resumo.codigo);
    } catch (falha) { setCupaoAplicado(null); setErro(falha.message); }
    finally { setAValidarCupao(false); }
  }

  async function concluirCompra(evento) {
    evento.preventDefault();
    if (!assentoId) return setErro('Selecione um assento disponível.');
    // O formulário precisa de ser lido antes da mudança de etapa. A etapa de
    // processamento desmonta o formulário e alguns navegadores móveis deixam
    // de disponibilizar o currentTarget depois dessa renderização.
    const formulario = Object.fromEntries(new FormData(evento.currentTarget));
    setAProcessar(true);
    setErro('');
    setEtapa('processando');
    try {
      const dadosPagamento = metodoPagamento === 'CARTAO'
        ? { numeroCartao: formulario.numeroCartao, validade: formulario.validade, cvv: formulario.cvv }
        : { telefone: formulario.telefone };
      setMensagemProcessamento(`A enviar o pedido para a API falsa ${nomeMetodoPagamento(metodoPagamento)}...`);
      const iniciada = await iniciarPagamentoSimulado({ viagemId: viagem.id, metodo: metodoPagamento, dadosPagamento, codigoCupao: cupaoAplicado?.codigo || null });
      setTransacaoPagamento(iniciada);
      setMensagemProcessamento('Pedido recebido. A aguardar a confirmação simulada...');
      const aprovada = await processarPagamentoSimulado(iniciada.referencia);
      setTransacaoPagamento(aprovada);
      setMensagemProcessamento('Pagamento aprovado. A emitir o bilhete eletrónico...');
      const compra = await comprarBilhete({ viagemId: viagem.id, assentoId, metodoPagamento, referenciaPagamento: aprovada.referencia, codigoCupao: cupaoAplicado?.codigo || null });
      setBilhete(compra.bilhete);
      setEtapa('concluida');
      aoComprar();
    } catch (falha) { setErro(falha.message); await actualizarAssentos().catch(() => {}); setEtapa('pagamento'); }
    finally { setAProcessar(false); }
  }

  const rota = viagem?.Route;
  const valorPagamento = cupaoAplicado?.valorFinal ?? Number(viagem?.price || 0);

  // A tela de processamento é um diálogo independente. Isto evita que seja
  // cortada pelo scroll e pelo overflow do modal de compra em ecrãs pequenos.
  if (etapa === 'processando') return <div className="modal-fundo modal-fundo-processamento">
    <section className="pagamento-processando vidro" role="dialog" aria-modal="true" aria-labelledby="titulo-processamento-pagamento" aria-live="polite">
      <span className="animacao-pagamento" aria-hidden="true"><i /><i /><i /></span>
      <h3 id="titulo-processamento-pagamento">Pagamento em processamento</h3>
      <p>{mensagemProcessamento}</p>
      <div className="detalhes-processamento">
        <span><small>Método</small><strong>{nomeMetodoPagamento(metodoPagamento)}</strong></span>
        <span><small>Valor</small><strong>{formatarMeticais(transacaoPagamento?.valor ?? valorPagamento)}</strong></span>
        {transacaoPagamento?.cupaoCodigo && <span><small>Cupão</small><strong>{transacaoPagamento.cupaoCodigo}</strong></span>}
        {transacaoPagamento && <span><small>Referência</small><strong>{transacaoPagamento.referencia}</strong></span>}
      </div>
      <small>Não feche esta tela durante a simulação.</small>
    </section>
  </div>;

  return <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && !aProcessar && aoFechar()}>
    <section className="modal-nova-viagem vidro" role="dialog" aria-modal="true" aria-labelledby="titulo-nova-viagem">
      <div className="modal-topo"><div><p className="etiqueta">Comprar bilhete</p><h2 id="titulo-nova-viagem">{tituloEtapa(etapa)}</h2><p>{descricaoEtapa(etapa)}</p></div><button className="fechar-modal" disabled={aProcessar} onClick={aoFechar} aria-label="Fechar">×</button></div>

      {etapa === 'pesquisa' && <form className="formulario-nova-viagem pesquisa-compra" onSubmit={pesquisar}>
        <SelecaoLocalidade pesquisavel prefixo="origem" titulo="Origem" />
        <SelecaoLocalidade pesquisavel prefixo="destino" titulo="Destino" />
        <label>Data da viagem <small>Opcional; sem data mostramos hoje e os próximos dias.</small><input name="data" type="date" min={obterDataHojeMaputo()} /></label>
        <button disabled={aProcessar} type="submit" className="botao-pesquisar"><Icone nome="pesquisa" /> {aProcessar ? 'A pesquisar...' : 'Pesquisar viagens'}</button>
      </form>}

      {etapa === 'resultados' && <div className="resultados-viagens">
        {viagens.length === 0 ? <div className="estado-vazio"><Icone nome="autocarro" /><strong>Nenhuma viagem encontrada</strong><p>Altere a origem, o destino ou escolha outra data e tente novamente.</p></div> : viagens.map((item) => <article className="opcao-viagem vidro" key={item.id}>
          <div className="identidade-viagem">{item.Empresa?.logoUrl ? <img src={`${URL_SERVIDOR}${item.Empresa.logoUrl}`} alt={`Logótipo da ${item.Empresa.nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<div><strong>{item.Route?.origin} → {item.Route?.destination}</strong><span>{item.Empresa?.nome || 'Empresa de transporte'} · {formatarDataHora(item.departureAt)}</span></div></div>
          <div className="preco-viagem"><small>Preço</small><strong>{formatarMeticais(item.price)}</strong></div>
          <button onClick={() => escolherViagem(item)} disabled={aProcessar}>Escolher</button>
        </article>)}
        <button className="botao-voltar" onClick={() => setEtapa('pesquisa')}>Alterar pesquisa</button>
      </div>}

      {etapa === 'assentos' && <div className="selecao-assento">
        <ResumoViagem viagem={viagem} />
        <div className="legenda-assentos"><span><i className="livre" /> Disponível</span><span><i className="reservado" /> Reservado agora</span><span><i className="ocupado" /> Vendido</span><span><i className="seleccionado" /> A sua seleção</span></div>
        <MapaAssentos assentos={assentos} assentoId={assentoId} aoSelecionar={seleccionarAssento} />
        {aReservar && <p className="estado-reserva-assento">A reservar o assento com segurança...</p>}
        {!aReservar && assentoId && <p className="estado-reserva-assento">Assento selecionado. Pode tocar noutro assento disponível para trocar.</p>}
        <div className="rodape-etapa"><button className="botao-voltar" onClick={async () => { await libertarAssento(); setViagem(null); setEtapa('resultados'); }}>Voltar</button><button className="botao-pesquisar" disabled={aReservar} onClick={() => assentoId ? setEtapa('pagamento') : setErro('Selecione um assento disponível.')}>Continuar para pagamento</button></div>
      </div>}

      {etapa === 'pagamento' && <form className="etapa-pagamento" onSubmit={concluirCompra}>
        <ResumoViagem viagem={viagem} assento={assentos.find((item) => String(item.id) === String(assentoId))} />
        <div className="aplicar-cupao"><label>Cupão de desconto<input value={codigoCupao} onChange={(evento) => { setCodigoCupao(evento.target.value.toUpperCase()); setCupaoAplicado(null); }} maxLength="30" placeholder="Introduza o código" /></label><button type="button" disabled={aValidarCupao || !codigoCupao.trim()} onClick={aplicarCupao}>{aValidarCupao ? 'A validar...' : 'Aplicar cupão'}</button>{cupaoAplicado && <p><strong>{cupaoAplicado.percentagem}% de desconto aplicado.</strong> Poupa {formatarMeticais(cupaoAplicado.desconto)}. Total: {formatarMeticais(cupaoAplicado.valorFinal)}.</p>}</div>
        <div className="metodos-pagamento">{[['MPESA', 'M-Pesa'], ['EMOLA', 'e-Mola'], ['CARTAO', 'Cartão']].map(([valor, nome]) => <label className={metodoPagamento === valor ? 'seleccionado' : ''} key={valor}><input type="radio" name="pagamento" value={valor} checked={metodoPagamento === valor} onChange={() => setMetodoPagamento(valor)} /><span>{nome}</span><small>Pagamento simulado</small></label>)}</div>
        {metodoPagamento === 'CARTAO' ? <div className="dados-pagamento-simulado dados-cartao"><label>Número do cartão de demonstração<input name="numeroCartao" inputMode="numeric" placeholder="4242 4242 4242 4242" pattern="[0-9 ]{16,19}" required /></label><label>Validade<input name="validade" placeholder="12/30" pattern="[0-9]{2}/[0-9]{2}" required /></label><label>CVV<input name="cvv" type="password" inputMode="numeric" placeholder="123" pattern="[0-9]{3,4}" required /></label></div> : <div className="dados-pagamento-simulado"><label>Número associado ao {nomeMetodoPagamento(metodoPagamento)}<input name="telefone" type="tel" defaultValue={utilizador.telefone} placeholder="84 000 0000" required /></label></div>}
        <p className="aviso-simulacao">Ambiente académico: utilize dados fictícios. A API é simulada e não movimenta dinheiro real.</p>
        <div className="rodape-etapa"><button type="button" className="botao-voltar" onClick={() => setEtapa('assentos')}>Voltar</button><button type="submit" className="botao-pesquisar">Simular pagamento de {formatarMeticais(valorPagamento)}</button></div>
      </form>}

      {etapa === 'concluida' && <div className="compra-concluida"><span className="icone-sucesso"><Icone nome="confirmado" /></span><h3>Bilhete emitido com sucesso</h3><p>O pagamento foi aprovado e o seu assento está confirmado.</p><div className="bilhete-resumo"><small>Código do bilhete</small><strong>{bilhete.codigo}</strong><span>{rota?.origin} → {rota?.destination}</span><span>Assento {bilhete.assento.numero} · {formatarMeticais(bilhete.preco)}</span></div><div className="acoes-bilhete-concluido"><BotaoPdfBilhete codigo={bilhete.codigo} className="botao-pesquisar" texto="Descarregar bilhete em PDF" /><button className="botao-voltar" onClick={aoFechar}>Concluir</button></div></div>}

      {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
      {!['concluida', 'processando'].includes(etapa) && <div className="vantagens-compra"><span><Icone nome="escudo" /> Pagamento seguro</span><span><Icone nome="bilhete" /> Bilhete eletrónico</span><span><Icone nome="confirmado" /> Confirmação imediata</span></div>}
    </section>
  </div>;
}

function ResumoViagem({ viagem, assento }) {
  return <div className="resumo-compra"><div><small>Empresa</small><strong>{viagem.Empresa?.nome || 'Empresa de transporte'}</strong></div><div><small>Rota</small><strong>{viagem.Route?.origin} → {viagem.Route?.destination}</strong></div><div><small>Partida</small><strong>{formatarDataHora(viagem.departureAt)}</strong></div>{assento && <div><small>Assento</small><strong>{assento.numero}</strong></div>}<div><small>Total</small><strong>{formatarMeticais(viagem.price)}</strong></div></div>;
}

function tituloEtapa(etapa) {
  return { pesquisa: 'Para onde deseja viajar?', resultados: 'Escolha a sua viagem', assentos: 'Selecione o assento', pagamento: 'Confirme o pagamento', processando: 'A processar pagamento', concluida: 'Compra concluída' }[etapa];
}

function descricaoEtapa(etapa) {
  return { pesquisa: 'Pesquise uma rota e encontre a melhor viagem para si.', resultados: 'Compare os horários e preços disponíveis.', assentos: 'Os assentos ocupados não podem ser selecionados.', pagamento: 'Escolha como deseja realizar o pagamento simulado.', processando: 'A API falsa está a validar e confirmar a operação.', concluida: 'O bilhete já está disponível na sua conta.' }[etapa];
}

function formatarMeticais(valor) {
  return formatarValor(valor);
}

function localidadesIguais(filtros) {
  const normalizar = (valor) => String(valor || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalizar(filtros.origem) && normalizar(filtros.origem) === normalizar(filtros.destino)
    && (!filtros.origemProvincia || !filtros.destinoProvincia || normalizar(filtros.origemProvincia) === normalizar(filtros.destinoProvincia));
}

function formatarDataHora(valor) {
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

function formatarData(valor) {
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium' }).format(new Date(valor));
}

function formatarHora(valor) {
  return new Intl.DateTimeFormat('pt-MZ', { hour: '2-digit', minute: '2-digit' }).format(new Date(valor));
}

function traduzirEstado(estado) {
  return { EMITIDO: 'Emitido', RESERVADO: 'Reservado', CANCELADO: 'Cancelado', UTILIZADO: 'Utilizado', APROVADO: 'Aprovado', PENDENTE: 'Pendente', REJEITADO: 'Rejeitado', REEMBOLSADO: 'Reembolsado' }[estado] || estado;
}

function nomeMetodoPagamento(metodo) {
  return { MPESA: 'M-Pesa', EMOLA: 'e-Mola', CARTAO: 'Cartão' }[metodo] || metodo;
}

function BotaoPdfBilhete({ codigo, className = 'botao-contorno', texto = 'PDF' }) {
  const [aDescarregar, setADescarregar] = useState(false);
  const [erro, setErro] = useState('');

  async function descarregar() {
    setADescarregar(true); setErro('');
    try {
      const ficheiro = await obterBilhetePdf(codigo);
      const endereco = URL.createObjectURL(ficheiro);
      const ligacao = document.createElement('a');
      ligacao.href = endereco;
      ligacao.download = `bilhete-${codigo}.pdf`;
      document.body.appendChild(ligacao);
      ligacao.click();
      ligacao.remove();
      URL.revokeObjectURL(endereco);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setADescarregar(false);
    }
  }

  return <span className="controlador-pdf"><button type="button" className={className} disabled={aDescarregar} onClick={descarregar}>{aDescarregar ? 'A gerar PDF...' : texto}</button>{erro && <small role="alert">{erro}</small>}</span>;
}
