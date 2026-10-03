import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import { actualizarViagemAdministrativa, cancelarViagemAdministrativa, criarAutocarro, criarRota, criarViagem, definirEstadoAdministrativo, obterPainelAdministrativo } from '../servicos/api.js';

const secoes = ['Visão geral', 'Passageiros', 'Autocarros', 'Rotas', 'Viagens', 'Bilhetes', 'Auditoria'];

export default function PainelAdministrador({ utilizador, aoSair }) {
  const [secao, setSecao] = useState('Visão geral');
  const [dados, setDados] = useState(null);
  const [versao, setVersao] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setErro('');
    obterPainelAdministrativo().then(setDados).catch((falha) => setErro(falha.message));
  }, [versao]);

  async function executar(operacao, mensagemSucesso) {
    setMensagem(''); setErro('');
    try { await operacao(); setMensagem(mensagemSucesso); setVersao((valor) => valor + 1); return true; }
    catch (falha) { setErro(falha.message); return false; }
  }

  async function submeter(evento, criador, mensagemSucesso) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    if (valores.capacidade) valores.capacidade = Number(valores.capacidade);
    const concluido = await executar(() => criador(valores), mensagemSucesso);
    if (concluido) formulario.reset();
  }

  return <div className="admin-aplicacao">
    <aside className="admin-lateral">
      <div className="logotipo"><span className="logotipo-icone"><Icone nome="autocarro" /></span><div><strong>Viagem Bus</strong><small>Administração</small></div></div>
      <nav>{secoes.map((item) => <button key={item} className={secao === item ? 'ativo' : ''} onClick={() => setSecao(item)}>{item}</button>)}</nav>
      <button className="admin-sair" onClick={aoSair}>Terminar sessão</button>
    </aside>
    <main className="admin-conteudo">
      <header className="admin-topo"><div><p>Painel administrativo</p><h1>{secao}</h1></div><div className="perfil-topo"><span className="avatar">{utilizador.nome.charAt(0)}</span><div><strong>{utilizador.nome}</strong><small>Administrador</small></div></div></header>
      {mensagem && <p className="mensagem-formulario sucesso">{mensagem}</p>}{erro && <p className="mensagem-formulario erro">{erro}</p>}
      {!dados ? <div className="painel-carregando vidro">A carregar informações administrativas...</div> : <ConteudoAdministrativo secao={secao} dados={dados} executar={executar} submeter={submeter} />}
    </main>
  </div>;
}

function ConteudoAdministrativo({ secao, dados, executar, submeter }) {
  if (secao === 'Passageiros') return <TabelaGestao titulo="Passageiros" colunas={['ID', 'Nome', 'Email', 'Perfil', 'Estado', 'Ação']} linhas={dados.passageiros.filter((item) => item.perfil === 'PASSAGEIRO').map((item) => [item.id, item.nome, item.email, item.perfil, item.activo ? 'Ativo' : 'Inativo', <BotaoEstado activo={item.activo} aoClicar={() => executar(() => definirEstadoAdministrativo('passageiros', item.id, !item.activo), 'Estado do passageiro atualizado.')} />])} />;
  if (secao === 'Autocarros') return <><FormularioAutocarro aoSubmeter={(e) => submeter(e, criarAutocarro, 'Autocarro criado com sucesso.')} /><TabelaGestao titulo="Frota" colunas={['ID', 'Matrícula', 'Modelo', 'Capacidade', 'Estado', 'Criado em', 'Ação']} linhas={dados.autocarros.map((item) => [item.id, item.registration, item.model, item.capacity, item.active ? 'Ativo' : 'Inativo', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('autocarros', item.id, !item.active), 'Estado do autocarro atualizado.')} />])} /></>;
  if (secao === 'Rotas') return <><FormularioRota aoSubmeter={(e) => submeter(e, criarRota, 'Rota criada com sucesso.')} /><TabelaGestao titulo="Rotas" colunas={['ID', 'Origem', 'Destino', 'Distância', 'Estado', 'Criada em', 'Ação']} linhas={dados.rotas.map((item) => [item.id, item.origin, item.destination, item.distanceKm ? `${item.distanceKm} km` : '—', item.active ? 'Ativa' : 'Inativa', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('rotas', item.id, !item.active), 'Estado da rota atualizado.')} />])} /></>;
  if (secao === 'Viagens') return <><FormularioViagem rotas={dados.rotas.filter((item) => item.active)} autocarros={dados.autocarros.filter((item) => item.active)} aoSubmeter={(e) => submeter(e, criarViagem, 'Viagem criada com sucesso.')} /><TabelaGestao titulo="Viagens" colunas={['ID', 'Rota', 'Autocarro', 'Partida', 'Chegada', 'Preço', 'Estado', 'Ações']} linhas={dados.viagens.map((item) => [item.id, `${item.Route?.origin} → ${item.Route?.destination}`, `${item.Bus?.registration || '—'} · ${item.Bus?.model || ''}`, formatarData(item.departureAt), item.arrivalExpectedAt ? formatarData(item.arrivalExpectedAt) : '—', formatarValor(item.price), item.status, <AcoesViagem viagem={item} executar={executar} />])} /></>;
  if (secao === 'Bilhetes') return <TabelaGestao titulo="Bilhetes emitidos" colunas={['Código', 'Passageiro', 'Rota', 'Autocarro', 'Assento', 'Pagamento', 'Referência', 'Preço', 'Estado', 'Emitido em']} linhas={dados.bilhetes.map((item) => [item.codigo, item.User?.nome || item.nomePassageiro, `${item.Trip?.Route?.origin || ''} → ${item.Trip?.Route?.destination || ''}`, item.Trip?.Bus?.registration || '—', item.Assento?.numero || '—', item.Pagamento?.metodo || '—', item.Pagamento?.referencia || '—', formatarValor(item.preco), item.estado, formatarData(item.criado_em)])} />;
  if (secao === 'Auditoria') return <TabelaGestao titulo="Registo de auditoria" colunas={['Data', 'Administrador', 'Operação', 'Entidade', 'Identificador', 'Endereço IP', 'Valores']} linhas={dados.auditorias.map((item) => [formatarData(item.criado_em), item.User?.nome || 'Sistema', item.operacao, item.entidade, item.entidadeId || '—', item.enderecoIp || '—', JSON.stringify(item.valoresNovos || {})])} />;
  return <VisaoGeral dados={dados} />;
}

function VisaoGeral({ dados }) {
  const itens = [['utilizador', 'Passageiros', dados.indicadores.passageiros], ['autocarro', 'Autocarros ativos', dados.indicadores.autocarrosActivos], ['viagens', 'Viagens agendadas', dados.indicadores.viagensAgendadas], ['bilhete', 'Bilhetes emitidos', dados.indicadores.bilhetesEmitidos], ['cartao', 'Receita aprovada', formatarValor(dados.indicadores.receitaAprovada)]];
  return <><section className="admin-indicadores">{itens.map(([icone, titulo, valor]) => <article className="vidro" key={titulo}><span className="resumo-icone"><Icone nome={icone} /></span><small>{titulo}</small><strong>{valor}</strong></article>)}</section><TabelaGestao titulo="Viagens recentes" colunas={['Rota', 'Partida', 'Preço', 'Estado']} linhas={dados.viagens.slice(0, 6).map((item) => [`${item.Route?.origin} → ${item.Route?.destination}`, formatarData(item.departureAt), formatarValor(item.price), item.status])} /></>;
}

function FormularioAutocarro({ aoSubmeter }) { return <form className="admin-formulario vidro" onSubmit={aoSubmeter}><h3>Novo autocarro</h3><label>Matrícula<input name="matricula" required /></label><label>Modelo<input name="modelo" required /></label><label>Capacidade<input name="capacidade" type="number" min="1" required /></label><button>Adicionar autocarro</button></form>; }
function FormularioRota({ aoSubmeter }) { return <form className="admin-formulario vidro" onSubmit={aoSubmeter}><h3>Nova rota</h3><label>Origem<input name="origem" required /></label><label>Destino<input name="destino" required /></label><label>Distância em km<input name="distanciaKm" type="number" min="1" /></label><button>Adicionar rota</button></form>; }
function FormularioViagem({ rotas, autocarros, aoSubmeter }) { return <form className="admin-formulario admin-formulario-viagem vidro" onSubmit={aoSubmeter}><h3>Nova viagem</h3><label>Rota<select name="rotaId" required><option value="">Selecionar</option>{rotas.map((item) => <option key={item.id} value={item.id}>{item.origin} → {item.destination}</option>)}</select></label><label>Autocarro<select name="autocarroId" required><option value="">Selecionar</option>{autocarros.map((item) => <option key={item.id} value={item.id}>{item.registration} · {item.model}</option>)}</select></label><label>Partida<input name="partidaEm" type="datetime-local" required /></label><label>Chegada prevista<input name="chegadaPrevistaEm" type="datetime-local" /></label><label>Preço<input name="preco" type="number" min="1" required /></label><button>Agendar viagem</button></form>; }

function AcoesViagem({ viagem, executar }) {
  function editar() {
    const preco = window.prompt('Novo preço da viagem:', viagem.price);
    if (!preco) return;
    executar(() => actualizarViagemAdministrativa(viagem.id, { preco: Number(preco) }), 'Preço da viagem atualizado.');
  }
  function cancelar() {
    if (!window.confirm('Deseja cancelar esta viagem?')) return;
    executar(() => cancelarViagemAdministrativa(viagem.id), 'Viagem cancelada com sucesso.');
  }
  return <span className="admin-acoes"><button onClick={editar}>Editar preço</button>{viagem.status === 'AGENDADA' && <button className="admin-desactivar" onClick={cancelar}>Cancelar</button>}</span>;
}

function TabelaGestao({ titulo, colunas, linhas }) {
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const porPagina = 8;
  const filtradas = linhas.filter((linha) => linha.filter((valor) => typeof valor !== 'object').join(' ').toLowerCase().includes(pesquisa.toLowerCase()));
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const visiveis = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);
  return <section className="admin-tabela vidro"><div className="titulo-secao"><h3>{titulo}</h3><span>{filtradas.length} registos</span></div><div className="admin-filtros"><input value={pesquisa} onChange={(evento) => { setPesquisa(evento.target.value); setPagina(1); }} placeholder="Pesquisar nesta tabela..." /></div><div className="admin-tabela-scroll"><table><thead><tr>{colunas.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visiveis.length ? visiveis.map((linha, indice) => <tr key={indice}>{linha.map((valor, posicao) => <td key={posicao}>{valor}</td>)}</tr>) : <tr><td colSpan={colunas.length}>Nenhum registo encontrado.</td></tr>}</tbody></table></div><div className="admin-paginacao"><button disabled={pagina === 1} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><span>Página {pagina} de {totalPaginas}</span><button disabled={pagina >= totalPaginas} onClick={() => setPagina((valor) => valor + 1)}>Seguinte</button></div></section>;
}
function BotaoEstado({ activo, aoClicar }) { return <button className={activo ? 'admin-desactivar' : 'admin-activar'} onClick={aoClicar}>{activo ? 'Desativar' : 'Ativar'}</button>; }
function formatarValor(valor) { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(Number(valor)); }
function formatarData(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)); }
