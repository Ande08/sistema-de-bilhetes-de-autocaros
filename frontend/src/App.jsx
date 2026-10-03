import { useEffect, useState } from 'react';
import Icone from './componentes/Icone.jsx';
import PainelAdministrador from './componentes/PainelAdministrador.jsx';
import { actualizarPerfil, alterarPalavraPasse, cancelarBilhete, comprarBilhete, guardarSessao, iniciarSessao, listarAssentos, obterPerfil, obterResumoConta, obterSessaoGuardada, pesquisarViagens, registarUtilizador, terminarSessao } from './servicos/api.js';

const itensMenu = [
  ['inicio', 'Início'], ['viagens', 'Minhas Viagens'], ['bilhete', 'Bilhetes'],
  ['cartao', 'Pagamentos'], ['utilizador', 'Perfil']
];

export default function App() {
  const [sessao, setSessao] = useState(() => obterSessaoGuardada());
  const [aVerificarSessao, setAVerificarSessao] = useState(Boolean(obterSessaoGuardada()));
  const [menuAberto, setMenuAberto] = useState(false);
  const [paginaAtiva, setPaginaAtiva] = useState('Início');
  const [novaViagemAberta, setNovaViagemAberta] = useState(false);
  const [resumoConta, setResumoConta] = useState(null);
  const [erroConta, setErroConta] = useState('');
  const [versaoConta, setVersaoConta] = useState(0);

  useEffect(() => {
    if (!sessao?.token || sessao.utilizador?.perfil === 'ADMIN') return;
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
    if (!sessao?.token) return;
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

  if (aVerificarSessao) {
    return <div className="estado-carregamento"><span className="marca-carregamento"><Icone nome="autocarro" /></span><p>A preparar a sua conta...</p></div>;
  }

  if (!sessao) {
    return <PaginaAutenticacao aoAutenticar={concluirAutenticacao} />;
  }

  const utilizador = sessao.utilizador;
  const primeiroNome = utilizador.nome.split(' ')[0];

  if (utilizador.perfil === 'ADMIN') {
    return <PainelAdministrador utilizador={utilizador} aoSair={sair} />;
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
      </aside>
      {menuAberto && <button className="fundo-menu" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}

      <main className="conteudo">
        <div className="topo">
          <label className="pesquisa vidro"><Icone nome="pesquisa" /><input placeholder="Pesquisar rotas, cidades ou viagens..." /></label>
          <div className="perfil-topo">
            <button className="botao-circular vidro" aria-label="Notificações"><Icone nome="sino" /></button>
            <span className="avatar">{primeiroNome.charAt(0).toUpperCase()}</span><strong>{primeiroNome}</strong><button className="botao-sair" onClick={sair}>Sair</button>
          </div>
        </div>

        <header className="cabecalho-painel"><div className="cabecalho-principal"><div>
          <p className="etiqueta">Painel do passageiro</p><h1>Minha Conta</h1><h2>Olá, {primeiroNome}</h2>
          <p>Aqui pode gerir as suas viagens, bilhetes, pagamentos e dados pessoais.</p>
        </div><button className="botao-nova-viagem" onClick={() => setNovaViagemAberta(true)}><span>+</span> Nova viagem</button></div></header>

        {erroConta && <p className="mensagem-formulario erro" role="alert">{erroConta}</p>}
        {!resumoConta ? <div className="painel-carregando vidro">A carregar os dados da sua conta...</div> :
          <ConteudoConta pagina={paginaAtiva} resumo={resumoConta} utilizador={utilizador} aoNovaViagem={() => setNovaViagemAberta(true)} aoActualizar={actualizarConta} aoActualizarUtilizador={(novoUtilizador) => {
            const sessaoActualizada = { ...sessao, utilizador: novoUtilizador };
            guardarSessao(sessaoActualizada);
            setSessao(sessaoActualizada);
          }} />}
      </main>
      <button className="botao-flutuante" onClick={() => setNovaViagemAberta(true)} aria-label="Comprar bilhete para uma nova viagem">+</button>
      {novaViagemAberta && <FluxoCompra aoFechar={() => setNovaViagemAberta(false)} aoComprar={actualizarConta} />}
    </div>
  );
}

function ConteudoConta({ pagina, resumo, utilizador, aoNovaViagem, aoActualizar, aoActualizarUtilizador }) {
  if (pagina === 'Perfil') return <PaginaPerfil utilizador={utilizador} aoActualizarUtilizador={aoActualizarUtilizador} />;
  if (pagina === 'Pagamentos') return <PaginaPagamentos pagamentos={resumo.pagamentos} />;
  if (pagina === 'Bilhetes') return <PaginaBilhetes bilhetes={resumo.bilhetes} aoActualizar={aoActualizar} />;
  if (pagina === 'Minhas Viagens') return <PaginaViagens viagens={resumo.bilhetes} aoActualizar={aoActualizar} />;
  return <PaginaInicio resumo={resumo} aoNovaViagem={aoNovaViagem} aoActualizar={aoActualizar} />;
}

function PaginaInicio({ resumo, aoNovaViagem, aoActualizar }) {
  const proxima = resumo.proximaViagem;
  return <>
    {proxima ? <section className="proxima-viagem" aria-label="Próxima viagem">
      <div className="viagem-conteudo">
        <div className="linha-estado"><span>Próxima viagem</span><span className="confirmado"><Icone nome="confirmado" /> Confirmado</span></div>
        <h3>{proxima.viagem.origem} <span>→</span> {proxima.viagem.destino}</h3>
        <div className="detalhes-viagem">
          <div><Icone nome="calendario" /><span><strong>{formatarData(proxima.viagem.partidaEm)}</strong><small>Data da viagem</small></span></div>
          <div><Icone nome="relogio" /><span><strong>{formatarHora(proxima.viagem.partidaEm)}</strong><small>Partida</small></span></div>
          <div><Icone nome="assento" /><span><strong>Assento {proxima.assento?.numero}</strong><small>{proxima.codigo}</small></span></div>
        </div>
        <div className="acoes-viagem"><button className="botao-claro" onClick={() => imprimirBilhete(proxima)}>Ver bilhete <Icone nome="seta" /></button><button className="botao-secundario" onClick={aoNovaViagem}>Comprar outro bilhete</button></div>
      </div><div className="arte-autocarro" aria-hidden="true"><Icone nome="autocarroGrande" /></div>
    </section> : <section className="sem-proxima-viagem vidro"><span><Icone nome="autocarro" /></span><div><h3>Ainda não tem uma viagem marcada</h3><p>Pesquise destinos disponíveis e compre o seu próximo bilhete.</p></div><button className="botao-nova-viagem" onClick={aoNovaViagem}>Nova viagem</button></section>}

    <section className="resumos">
      <CartaoResumo icone="autocarro" titulo="Próxima viagem" valor={proxima ? `${proxima.viagem.origem} → ${proxima.viagem.destino}` : 'Sem viagem'} detalhe={proxima ? formatarDataHora(proxima.viagem.partidaEm) : 'Compre um novo bilhete'} />
      <CartaoResumo icone="bilhete" titulo="Bilhetes ativos" valor={String(resumo.totalBilhetesActivos)} detalhe="Viagens futuras" />
      <CartaoResumo icone="cartao" titulo="Pagamentos" valor={String(resumo.totalPagamentosSeisMeses)} detalhe="Últimos 6 meses" />
    </section>
    <section className="grelha-inferior">
      <TabelaBilhetes titulo="Viagens recentes" bilhetes={resumo.viagensRecentes} aoActualizar={aoActualizar} />
      <aside className="suporte"><span className="suporte-icone"><Icone nome="suporte" /></span><h3>Precisa de ajuda?</h3><p>A nossa equipa está pronta para ajudar com as suas viagens, bilhetes ou pagamentos.</p><button className="botao-claro">Falar com o suporte <Icone nome="seta" /></button><div className="links-suporte"><button><Icone nome="ajuda" /> Perguntas frequentes</button><button><Icone nome="documento" /> Políticas e termos</button></div></aside>
    </section>
  </>;
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

  async function cancelar(item) {
    if (!window.confirm(`Deseja cancelar o bilhete ${item.codigo}?`)) return;
    setCodigoEmCurso(item.codigo);
    setErro('');
    try { await cancelarBilhete(item.codigo); aoActualizar(); }
    catch (falha) { setErro(falha.message); }
    finally { setCodigoEmCurso(''); }
  }

  const conteudo = <>
    {titulo && <div className="titulo-secao"><h3>{titulo}</h3></div>}
    <div className="tabela-cabecalho"><span>Data</span><span>Origem → Destino</span><span>Assento</span><span>Estado</span><span>Ações</span></div>
    <div className="linhas-viagem">{bilhetes.length === 0 ? <EstadoVazio texto="Ainda não existem viagens nesta conta." /> : bilhetes.map((item) => <div className="linha-viagem" key={item.codigo}>
      <span data-label="Data">{item.viagem ? formatarData(item.viagem.partidaEm) : '—'}</span><span data-label="Rota">{item.viagem ? `${item.viagem.origem} → ${item.viagem.destino}` : '—'}</span><span data-label="Assento">{item.assento?.numero || '—'}</span><span data-label="Estado"><b className={`estado-bilhete estado-${item.estado.toLowerCase()}`}>{traduzirEstado(item.estado)}</b></span><span data-label="Ação" className="acoes-linha"><button className="botao-contorno" onClick={() => imprimirBilhete(item)}>Ver</button>{['EMITIDO', 'RESERVADO'].includes(item.estado) && item.viagem && new Date(item.viagem.partidaEm) > new Date() && <button className="botao-cancelar" disabled={codigoEmCurso === item.codigo} onClick={() => cancelar(item)}>Cancelar</button>}</span>
    </div>)}</div>{erro && <p className="mensagem-formulario erro">{erro}</p>}
  </>;
  return semMoldura ? conteudo : <div className="historico vidro">{conteudo}</div>;
}

function PaginaPagamentos({ pagamentos }) {
  return <section className="pagina-dados vidro"><div className="titulo-secao"><div><p className="etiqueta">Movimentos</p><h3>Pagamentos</h3></div><span>{pagamentos.length} registos</span></div><div className="lista-pagamentos">{pagamentos.length === 0 ? <EstadoVazio texto="Ainda não existem pagamentos nesta conta." /> : pagamentos.map((item) => <article key={item.referencia}><span className="resumo-icone"><Icone nome="cartao" /></span><div><strong>{nomeMetodoPagamento(item.metodo)}</strong><small>{item.referencia} · Bilhete {item.bilheteCodigo}</small></div><div className="valor-pagamento"><strong>{formatarMeticais(item.valor)}</strong><small>{item.criadoEm ? formatarData(item.criadoEm) : ''}</small></div><b className={`estado-bilhete estado-${item.estado.toLowerCase()}`}>{traduzirEstado(item.estado)}</b></article>)}</div></section>;
}

function PaginaPerfil({ utilizador, aoActualizarUtilizador }) {
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function guardarPerfil(evento) {
    evento.preventDefault(); setMensagem(''); setErro('');
    try { const actualizado = await actualizarPerfil(Object.fromEntries(new FormData(evento.currentTarget))); aoActualizarUtilizador(actualizado); setMensagem('Dados pessoais atualizados com sucesso.'); }
    catch (falha) { setErro(falha.message); }
  }

  async function guardarPalavraPasse(evento) {
    evento.preventDefault(); setMensagem(''); setErro('');
    try { const resposta = await alterarPalavraPasse(Object.fromEntries(new FormData(evento.currentTarget))); setMensagem(resposta.mensagem); evento.currentTarget.reset(); }
    catch (falha) { setErro(falha.message); }
  }

  return <section className="grelha-perfil"><form className="pagina-dados vidro formulario-perfil" onSubmit={guardarPerfil}><p className="etiqueta">Dados pessoais</p><h3>Informações da conta</h3><label>Nome completo<input name="nome" defaultValue={utilizador.nome} required minLength="3" /></label><label>Email<input name="email" type="email" defaultValue={utilizador.email} required /></label><button className="botao-pesquisar">Guardar alterações</button></form><form className="pagina-dados vidro formulario-perfil" onSubmit={guardarPalavraPasse}><p className="etiqueta">Segurança</p><h3>Alterar palavra-passe</h3><label>Palavra-passe atual<input name="palavraPasseActual" type="password" required /></label><label>Nova palavra-passe<input name="novaPalavraPasse" type="password" minLength="8" required /></label><button className="botao-pesquisar">Alterar palavra-passe</button></form>{mensagem && <p className="mensagem-formulario sucesso mensagem-perfil">{mensagem}</p>}{erro && <p className="mensagem-formulario erro mensagem-perfil">{erro}</p>}</section>;
}

function EstadoVazio({ texto }) {
  return <div className="estado-vazio estado-vazio-lista"><Icone nome="bilhete" /><strong>{texto}</strong></div>;
}

function CartaoResumo({ icone, titulo, valor, detalhe }) {
  return <article className="cartao-resumo vidro"><span className="resumo-icone"><Icone nome={icone} /></span><div><small>{titulo}</small><strong>{valor}</strong><p>{detalhe}</p></div><Icone nome="seta" /></article>;
}

function PaginaAutenticacao({ aoAutenticar }) {
  const [modo, setModo] = useState('entrar');
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
      if (modo === 'registar') {
        await registarUtilizador(dados);
        setModo('entrar');
        setTipoMensagem('sucesso');
        setMensagem('Conta criada com sucesso. Já pode iniciar sessão.');
        evento.currentTarget.reset();
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
      <div className="titulo-autenticacao"><h2>{modo === 'entrar' ? 'Bem-vindo de volta' : 'Crie a sua conta'}</h2><p>{modo === 'entrar' ? 'Introduza os seus dados para continuar.' : 'Não é necessário apresentar documento pessoal.'}</p></div>
      <form className="formulario-autenticacao" onSubmit={submeter}>
        {modo === 'registar' && <label>Nome completo<input name="nome" autoComplete="name" minLength="3" maxLength="120" required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Palavra-passe<div className="campo-palavra-passe"><input name="palavraPasse" type={mostrarPalavraPasse ? 'text' : 'password'} minLength="8" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required /><button type="button" onClick={() => setMostrarPalavraPasse((visivel) => !visivel)} aria-label={mostrarPalavraPasse ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} title={mostrarPalavraPasse ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}><Icone nome={mostrarPalavraPasse ? 'olhoFechado' : 'olho'} /></button></div></label>
        {mensagem && <p className={`mensagem-formulario ${tipoMensagem}`} role="status">{mensagem}</p>}
        <button className="botao-autenticacao" disabled={aProcessar}>{aProcessar ? 'A processar...' : modo === 'entrar' ? 'Entrar na minha conta' : 'Criar conta'}</button>
      </form>
      <p className="nota-seguranca"><Icone nome="escudo" /> Os seus dados são protegidos e utilizados apenas para gerir as viagens.</p>
    </section>
  </main>;
}

function FluxoCompra({ aoFechar, aoComprar }) {
  const [etapa, setEtapa] = useState('pesquisa');
  const [viagens, setViagens] = useState([]);
  const [viagem, setViagem] = useState(null);
  const [assentos, setAssentos] = useState([]);
  const [assentoId, setAssentoId] = useState(null);
  const [metodoPagamento, setMetodoPagamento] = useState('MPESA');
  const [bilhete, setBilhete] = useState(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');

  async function pesquisar(evento) {
    evento.preventDefault();
    setAProcessar(true);
    setErro('');
    try {
      const resultados = await pesquisarViagens(Object.fromEntries(new FormData(evento.currentTarget)));
      setViagens(resultados);
      setEtapa('resultados');
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function escolherViagem(seleccionada) {
    setAProcessar(true);
    setErro('');
    try {
      setAssentos(await listarAssentos(seleccionada.id));
      setViagem(seleccionada);
      setEtapa('assentos');
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function concluirCompra() {
    if (!assentoId) return setErro('Selecione um assento disponível.');
    setAProcessar(true);
    setErro('');
    try {
      const compra = await comprarBilhete({ viagemId: viagem.id, assentoId, metodoPagamento });
      setBilhete(compra.bilhete);
      setEtapa('concluida');
      aoComprar();
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  const rota = viagem?.Route;
  return <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar()}>
    <section className="modal-nova-viagem vidro" role="dialog" aria-modal="true" aria-labelledby="titulo-nova-viagem">
      <div className="modal-topo"><div><p className="etiqueta">Comprar bilhete</p><h2 id="titulo-nova-viagem">{tituloEtapa(etapa)}</h2><p>{descricaoEtapa(etapa)}</p></div><button className="fechar-modal" onClick={aoFechar} aria-label="Fechar">×</button></div>

      {etapa === 'pesquisa' && <form className="formulario-nova-viagem pesquisa-compra" onSubmit={pesquisar}>
        <label>Origem<input name="origem" placeholder="Ex.: Tete" required /></label>
        <label>Destino<input name="destino" placeholder="Ex.: Maputo" required /></label>
        <label>Data da viagem<input name="data" type="date" min={new Date().toISOString().slice(0, 10)} required /></label>
        <button disabled={aProcessar} type="submit" className="botao-pesquisar"><Icone nome="pesquisa" /> {aProcessar ? 'A pesquisar...' : 'Pesquisar viagens'}</button>
      </form>}

      {etapa === 'resultados' && <div className="resultados-viagens">
        {viagens.length === 0 ? <div className="estado-vazio"><Icone nome="autocarro" /><strong>Nenhuma viagem encontrada</strong><p>Altere a origem, o destino ou a data e tente novamente.</p></div> : viagens.map((item) => <article className="opcao-viagem vidro" key={item.id}>
          <div><strong>{item.Route?.origin} → {item.Route?.destination}</strong><span>{formatarDataHora(item.departureAt)}</span></div>
          <div className="preco-viagem"><small>Preço</small><strong>{formatarMeticais(item.price)}</strong></div>
          <button onClick={() => escolherViagem(item)} disabled={aProcessar}>Escolher</button>
        </article>)}
        <button className="botao-voltar" onClick={() => setEtapa('pesquisa')}>Alterar pesquisa</button>
      </div>}

      {etapa === 'assentos' && <div className="selecao-assento">
        <ResumoViagem viagem={viagem} />
        <div className="legenda-assentos"><span><i className="livre" /> Disponível</span><span><i className="ocupado" /> Ocupado</span><span><i className="seleccionado" /> Selecionado</span></div>
        <div className="mapa-assentos" aria-label="Seleção de assento">{assentos.map((assento) => <button key={assento.id} disabled={!assento.disponivel} className={String(assentoId) === String(assento.id) ? 'seleccionado' : ''} onClick={() => setAssentoId(assento.id)}>{assento.numero}</button>)}</div>
        <div className="rodape-etapa"><button className="botao-voltar" onClick={() => setEtapa('resultados')}>Voltar</button><button className="botao-pesquisar" onClick={() => assentoId ? setEtapa('pagamento') : setErro('Selecione um assento disponível.')}>Continuar para pagamento</button></div>
      </div>}

      {etapa === 'pagamento' && <div className="etapa-pagamento">
        <ResumoViagem viagem={viagem} assento={assentos.find((item) => String(item.id) === String(assentoId))} />
        <div className="metodos-pagamento">{[['MPESA', 'M-Pesa'], ['EMOLA', 'e-Mola'], ['CARTAO', 'Cartão']].map(([valor, nome]) => <label className={metodoPagamento === valor ? 'seleccionado' : ''} key={valor}><input type="radio" name="pagamento" value={valor} checked={metodoPagamento === valor} onChange={() => setMetodoPagamento(valor)} /><span>{nome}</span><small>Pagamento simulado</small></label>)}</div>
        <p className="aviso-simulacao">Esta demonstração não movimenta dinheiro real. O pagamento será confirmado automaticamente.</p>
        <div className="rodape-etapa"><button className="botao-voltar" onClick={() => setEtapa('assentos')}>Voltar</button><button className="botao-pesquisar" disabled={aProcessar} onClick={concluirCompra}>{aProcessar ? 'A confirmar...' : `Pagar ${formatarMeticais(viagem.price)}`}</button></div>
      </div>}

      {etapa === 'concluida' && <div className="compra-concluida"><span className="icone-sucesso"><Icone nome="confirmado" /></span><h3>Bilhete emitido com sucesso</h3><p>O pagamento foi aprovado e o seu assento está confirmado.</p><div className="bilhete-resumo"><small>Código do bilhete</small><strong>{bilhete.codigo}</strong><span>{rota?.origin} → {rota?.destination}</span><span>Assento {bilhete.assento.numero} · {formatarMeticais(bilhete.preco)}</span></div><button className="botao-pesquisar" onClick={aoFechar}>Concluir</button></div>}

      {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
      {etapa !== 'concluida' && <div className="vantagens-compra"><span><Icone nome="escudo" /> Pagamento seguro</span><span><Icone nome="bilhete" /> Bilhete eletrónico</span><span><Icone nome="confirmado" /> Confirmação imediata</span></div>}
    </section>
  </div>;
}

function ResumoViagem({ viagem, assento }) {
  return <div className="resumo-compra"><div><small>Rota</small><strong>{viagem.Route?.origin} → {viagem.Route?.destination}</strong></div><div><small>Partida</small><strong>{formatarDataHora(viagem.departureAt)}</strong></div>{assento && <div><small>Assento</small><strong>{assento.numero}</strong></div>}<div><small>Total</small><strong>{formatarMeticais(viagem.price)}</strong></div></div>;
}

function tituloEtapa(etapa) {
  return { pesquisa: 'Para onde deseja viajar?', resultados: 'Escolha a sua viagem', assentos: 'Selecione o assento', pagamento: 'Confirme o pagamento', concluida: 'Compra concluída' }[etapa];
}

function descricaoEtapa(etapa) {
  return { pesquisa: 'Pesquise uma rota e encontre a melhor viagem para si.', resultados: 'Compare os horários e preços disponíveis.', assentos: 'Os assentos ocupados não podem ser selecionados.', pagamento: 'Escolha como deseja realizar o pagamento simulado.', concluida: 'O bilhete já está disponível na sua conta.' }[etapa];
}

function formatarMeticais(valor) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(Number(valor));
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

function imprimirBilhete(bilhete) {
  const janela = window.open('', '_blank', 'width=620,height=760');
  if (!janela) return;
  const linhas = [
    'VIAGEM BUS', 'BILHETE ELETRÓNICO', '',
    `Código: ${bilhete.codigo}`,
    `Passageiro: ${bilhete.nomePassageiro || 'Titular da conta'}`,
    `Rota: ${bilhete.viagem?.origem || ''} → ${bilhete.viagem?.destino || ''}`,
    `Partida: ${bilhete.viagem ? formatarDataHora(bilhete.viagem.partidaEm) : ''}`,
    `Assento: ${bilhete.assento?.numero || ''}`,
    `Preço: ${formatarMeticais(bilhete.preco)}`,
    `Estado: ${traduzirEstado(bilhete.estado)}`
  ];
  janela.document.title = `Bilhete ${bilhete.codigo}`;
  const pre = janela.document.createElement('pre');
  pre.textContent = linhas.join('\n');
  pre.style.cssText = 'font:16px/1.7 Arial;padding:40px;color:#08264d;white-space:pre-wrap';
  janela.document.body.appendChild(pre);
  janela.print();
}
