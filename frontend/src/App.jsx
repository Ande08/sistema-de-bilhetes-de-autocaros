import { useState } from 'react';
import Icone from './componentes/Icone.jsx';

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
  const [menuAberto, setMenuAberto] = useState(false);
  const [paginaAtiva, setPaginaAtiva] = useState('Início');

  function selecionarPagina(nome) {
    setPaginaAtiva(nome);
    setMenuAberto(false);
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
            <span className="avatar">I</span><strong>Ico</strong><Icone nome="baixo" />
          </div>
        </div>

        <header className="cabecalho-painel">
          <p className="etiqueta">Painel do passageiro</p><h1>Minha Conta</h1><h2>Olá, Ico</h2>
          <p>Aqui pode gerir as suas viagens, bilhetes, pagamentos e dados pessoais.</p>
        </header>

        <section className="proxima-viagem" aria-label="Próxima viagem">
          <div className="viagem-conteudo">
            <div className="linha-estado"><span>Próxima viagem</span><span className="confirmado"><Icone nome="confirmado" /> Confirmado</span></div>
            <h3>Tete <span>→</span> Maputo</h3>
            <div className="detalhes-viagem">
              <div><Icone nome="calendario" /><span><strong>15 de Outubro de 2026</strong><small>Quinta-feira</small></span></div>
              <div><Icone nome="relogio" /><span><strong>08:00</strong><small>Partida</small></span></div>
              <div><Icone nome="assento" /><span><strong>Assento A1</strong><small>Classe normal</small></span></div>
            </div>
            <button className="botao-claro">Ver bilhete <Icone nome="seta" /></button>
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
    </div>
  );
}

function CartaoResumo({ icone, titulo, valor, detalhe }) {
  return <article className="cartao-resumo vidro"><span className="resumo-icone"><Icone nome={icone} /></span><div><small>{titulo}</small><strong>{valor}</strong><p>{detalhe}</p></div><Icone nome="seta" /></article>;
}
