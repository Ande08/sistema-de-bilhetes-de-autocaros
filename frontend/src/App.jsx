import { useEffect, useState } from 'react';
import Icone from './componentes/Icone.jsx';
import { guardarSessao, iniciarSessao, obterPerfil, obterSessaoGuardada, registarUtilizador, terminarSessao } from './servicos/api.js';

const viagensRecentes = [
  { data: '10 Fev 2026', rota: 'Nampula → Tete', assento: 'B4' },
  { data: '22 Jan 2026', rota: 'Maputo → Beira', assento: 'C2' },
  { data: '05 Jan 2026', rota: 'Tete → Nampula', assento: 'A3' },
  { data: '12 Dez 2025', rota: 'Beira → Maputo', assento: 'D1' }
];

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
  const [mensagemPesquisa, setMensagemPesquisa] = useState('');

  useEffect(() => {
    if (!sessao?.token) return;
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

  if (aVerificarSessao) {
    return <div className="estado-carregamento"><span className="marca-carregamento"><Icone nome="autocarro" /></span><p>A preparar a sua conta...</p></div>;
  }

  if (!sessao) {
    return <PaginaAutenticacao aoAutenticar={concluirAutenticacao} />;
  }

  const utilizador = sessao.utilizador;
  const primeiroNome = utilizador.nome.split(' ')[0];

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

        <section className="proxima-viagem" aria-label="Próxima viagem">
          <div className="viagem-conteudo">
            <div className="linha-estado"><span>Próxima viagem</span><span className="confirmado"><Icone nome="confirmado" /> Confirmado</span></div>
            <h3>Tete <span>→</span> Maputo</h3>
            <div className="detalhes-viagem">
              <div><Icone nome="calendario" /><span><strong>15 de Outubro de 2026</strong><small>Quinta-feira</small></span></div>
              <div><Icone nome="relogio" /><span><strong>08:00</strong><small>Partida</small></span></div>
              <div><Icone nome="assento" /><span><strong>Assento A1</strong><small>Classe normal</small></span></div>
            </div>
            <div className="acoes-viagem"><button className="botao-claro">Ver bilhete <Icone nome="seta" /></button><button className="botao-secundario" onClick={() => setNovaViagemAberta(true)}>Comprar outro bilhete</button></div>
          </div>
          <div className="arte-autocarro" aria-hidden="true"><Icone nome="autocarroGrande" /></div>
        </section>

        <section className="resumos">
          <CartaoResumo icone="autocarro" titulo="Próxima viagem" valor="Tete → Maputo" detalhe="15 de Outubro · 08:00" />
          <CartaoResumo icone="bilhete" titulo="Bilhetes ativos" valor="2" detalhe="Viagens futuras" />
          <CartaoResumo icone="cartao" titulo="Pagamentos" valor="3" detalhe="Últimos 6 meses" />
        </section>

        <section className="grelha-inferior">
          <div className="historico vidro">
            <div className="titulo-secao"><h3>Viagens recentes</h3><button>Ver todas <Icone nome="seta" /></button></div>
            <div className="tabela-cabecalho"><span>Data</span><span>Origem → Destino</span><span>Assento</span><span>Estado</span><span>Ações</span></div>
            <div className="linhas-viagem">
              {viagensRecentes.map((viagem) => (
                <div className="linha-viagem" key={`${viagem.data}-${viagem.rota}`}>
                  <span data-label="Data">{viagem.data}</span><span data-label="Rota">{viagem.rota}</span>
                  <span data-label="Assento">{viagem.assento}</span><span data-label="Estado"><b className="estado-concluida">Concluída</b></span>
                  <span data-label="Ação"><button className="botao-contorno">Ver bilhete</button></span>
                </div>
              ))}
            </div>
          </div>

          <aside className="suporte">
            <span className="suporte-icone"><Icone nome="suporte" /></span><h3>Precisa de ajuda?</h3>
            <p>A nossa equipa está pronta para ajudar com as suas viagens, bilhetes ou pagamentos.</p>
            <button className="botao-claro">Falar com o suporte <Icone nome="seta" /></button>
            <div className="links-suporte"><button><Icone nome="ajuda" /> Perguntas frequentes</button><button><Icone nome="documento" /> Políticas e termos</button></div>
          </aside>
        </section>
      </main>
      <button className="botao-flutuante" onClick={() => setNovaViagemAberta(true)} aria-label="Comprar bilhete para uma nova viagem">+</button>
      {novaViagemAberta && <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && setNovaViagemAberta(false)}>
        <section className="modal-nova-viagem vidro" role="dialog" aria-modal="true" aria-labelledby="titulo-nova-viagem">
          <div className="modal-topo"><div><p className="etiqueta">Comprar bilhete</p><h2 id="titulo-nova-viagem">Para onde deseja viajar?</h2><p>Pesquise uma rota e escolha a melhor viagem para si.</p></div><button className="fechar-modal" onClick={() => setNovaViagemAberta(false)} aria-label="Fechar">×</button></div>
          <form className="formulario-nova-viagem" onSubmit={(evento) => { evento.preventDefault(); setMensagemPesquisa('A procurar viagens disponíveis para a data selecionada.'); }}>
            <label>Origem<input name="origem" placeholder="Ex.: Tete" required /></label><button type="button" className="trocar-rota" aria-label="Trocar origem e destino">⇄</button>
            <label>Destino<input name="destino" placeholder="Ex.: Maputo" required /></label><label>Data da viagem<input name="data" type="date" required /></label>
            <label>Passageiros<select name="passageiros" defaultValue="1"><option value="1">1 passageiro</option><option value="2">2 passageiros</option><option value="3">3 passageiros</option></select></label>
            <button type="submit" className="botao-pesquisar"><Icone nome="pesquisa" /> Pesquisar viagens</button>
          </form>
          {mensagemPesquisa && <p className="mensagem-pesquisa" role="status">{mensagemPesquisa}</p>}
          <div className="vantagens-compra"><span><Icone nome="escudo" /> Pagamento seguro</span><span><Icone nome="bilhete" /> Bilhete eletrónico</span><span><Icone nome="confirmado" /> Confirmação imediata</span></div>
        </section>
      </div>}
    </div>
  );
}

function CartaoResumo({ icone, titulo, valor, detalhe }) {
  return <article className="cartao-resumo vidro"><span className="resumo-icone"><Icone nome={icone} /></span><div><small>{titulo}</small><strong>{valor}</strong><p>{detalhe}</p></div><Icone nome="seta" /></article>;
}

function PaginaAutenticacao({ aoAutenticar }) {
  const [modo, setModo] = useState('entrar');
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
        <label>Palavra-passe<input name="palavraPasse" type="password" minLength="8" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required /></label>
        {mensagem && <p className={`mensagem-formulario ${tipoMensagem}`} role="status">{mensagem}</p>}
        <button className="botao-autenticacao" disabled={aProcessar}>{aProcessar ? 'A processar...' : modo === 'entrar' ? 'Entrar na minha conta' : 'Criar conta'}</button>
      </form>
      <p className="nota-seguranca"><Icone nome="escudo" /> Os seus dados são protegidos e utilizados apenas para gerir as viagens.</p>
    </section>
  </main>;
}
