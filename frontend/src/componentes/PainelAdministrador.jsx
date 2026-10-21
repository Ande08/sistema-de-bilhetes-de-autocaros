import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import ChatTicketSuporte, { traduzirEstado } from './ChatTicketSuporte.jsx';
import { ModalCampo, ModalConfirmacao } from './Modal.jsx';
import { actualizarUtilizadorAdministrativo, actualizarViagemAdministrativa, atribuirTicketSuporte, cancelarViagemAdministrativa, criarAutocarro, criarRota, criarUtilizadorAdministrativo, criarViagem, definirEstadoAdministrativo, enviarAvisoViagemAdministrativa, guardarConfiguracaoIa, iniciarWhatsApp, listarGestoresSuporte, listarModelosIa, listarTicketsSuporte, obterConfiguracaoIa, obterEstadoWhatsApp, obterPainelAdministrativo, redefinirPalavraPasseAdministrativa, repetirEnvioWhatsapp, testarLigacaoIa } from '../servicos/api.js';
import { formatarValor } from '../utilitarios/moeda.js';

const secoes = ['Visão geral', 'Utilizadores', 'Autocarros', 'Rotas', 'Viagens', 'Bilhetes', 'Suporte', 'Inteligência artificial', 'WhatsApp', 'Auditoria'];

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
      <header className="admin-topo"><div><p>Painel administrativo</p><h1>{secao}</h1></div><div className="perfil-topo"><span className="avatar">{utilizador.nome.charAt(0)}</span><div><strong>{nomePessoa(utilizador)}</strong><small>Administrador</small></div></div></header>
      {mensagem && <p className="mensagem-formulario sucesso">{mensagem}</p>}{erro && <p className="mensagem-formulario erro">{erro}</p>}
      {!dados ? <div className="painel-carregando vidro">A carregar informações administrativas...</div> : <ConteudoAdministrativo secao={secao} dados={dados} executar={executar} submeter={submeter} />}
    </main>
  </div>;
}

function ConteudoAdministrativo({ secao, dados, executar, submeter }) {
  if (secao === 'Utilizadores') return <PaginaUtilizadores utilizadores={dados.passageiros} executar={executar} />;
  if (secao === 'Autocarros') return <><FormularioAutocarro aoSubmeter={(e) => submeter(e, criarAutocarro, 'Autocarro criado com sucesso.')} /><TabelaGestao titulo="Frota" colunas={['ID', 'Matrícula', 'Modelo', 'Capacidade', 'Estado', 'Criado em', 'Ação']} linhas={dados.autocarros.map((item) => [item.id, item.registration, item.model, item.capacity, item.active ? 'Ativo' : 'Inativo', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('autocarros', item.id, !item.active), 'Estado do autocarro atualizado.')} />])} /></>;
  if (secao === 'Rotas') return <><FormularioRota aoSubmeter={(e) => submeter(e, criarRota, 'Rota criada com sucesso.')} /><TabelaGestao titulo="Rotas" colunas={['ID', 'Origem', 'Destino', 'Distância', 'Estado', 'Criada em', 'Ação']} linhas={dados.rotas.map((item) => [item.id, item.origin, item.destination, item.distanceKm ? `${item.distanceKm} km` : '—', item.active ? 'Ativa' : 'Inativa', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('rotas', item.id, !item.active), 'Estado da rota atualizado.')} />])} /></>;
  if (secao === 'Viagens') return <><FormularioViagem rotas={dados.rotas.filter((item) => item.active)} autocarros={dados.autocarros.filter((item) => item.active)} aoSubmeter={(e) => submeter(e, criarViagem, 'Viagem criada com sucesso.')} /><TabelaGestao titulo="Viagens" colunas={['ID', 'Rota', 'Autocarro', 'Partida', 'Chegada', 'Preço', 'Estado', 'Ações']} linhas={dados.viagens.map((item) => [item.id, `${item.Route?.origin} → ${item.Route?.destination}`, `${item.Bus?.registration || '—'} · ${item.Bus?.model || ''}`, formatarData(item.departureAt), item.arrivalExpectedAt ? formatarData(item.arrivalExpectedAt) : '—', formatarValor(item.price), item.status, <AcoesViagem viagem={item} executar={executar} />])} /></>;
  if (secao === 'Bilhetes') return <TabelaGestao titulo="Bilhetes emitidos" colunas={['Código', 'Passageiro', 'Rota', 'Autocarro', 'Assento', 'Pagamento', 'Referência', 'Preço', 'Estado', 'Emitido em']} linhas={dados.bilhetes.map((item) => [item.codigo, item.User ? nomePessoa(item.User) : item.nomePassageiro, `${item.Trip?.Route?.origin || ''} → ${item.Trip?.Route?.destination || ''}`, item.Trip?.Bus?.registration || '—', item.Assento?.numero || '—', item.Pagamento?.metodo || '—', item.Pagamento?.referencia || '—', formatarValor(item.preco), item.estado, formatarData(item.criado_em)])} />;
  if (secao === 'Suporte') return <PaginaGestaoSuporte />;
  if (secao === 'Inteligência artificial') return <PaginaInteligenciaArtificial />;
  if (secao === 'WhatsApp') return <PaginaWhatsApp />;
  if (secao === 'Auditoria') return <PaginaAuditoria auditorias={dados.auditorias} />;
  return <VisaoGeral dados={dados} />;
}

function VisaoGeral({ dados }) {
  const itens = [['utilizador', 'Passageiros', dados.indicadores.passageiros], ['autocarro', 'Autocarros ativos', dados.indicadores.autocarrosActivos], ['viagens', 'Viagens agendadas', dados.indicadores.viagensAgendadas], ['bilhete', 'Bilhetes emitidos', dados.indicadores.bilhetesEmitidos], ['cartao', 'Receita aprovada', formatarValor(dados.indicadores.receitaAprovada)]];
  return <><section className="admin-indicadores">{itens.map(([icone, titulo, valor]) => <article className="vidro" key={titulo}><span className="resumo-icone"><Icone nome={icone} /></span><small>{titulo}</small><strong>{valor}</strong></article>)}</section><TabelaGestao titulo="Viagens recentes" colunas={['Rota', 'Partida', 'Preço', 'Estado']} linhas={dados.viagens.slice(0, 6).map((item) => [`${item.Route?.origin} → ${item.Route?.destination}`, formatarData(item.departureAt), formatarValor(item.price), item.status])} /></>;
}

function PaginaUtilizadores({ utilizadores, executar }) {
  const [emEdicao, setEmEdicao] = useState(null);
  const [utilizadorRedefinir, setUtilizadorRedefinir] = useState(null);
  const [aRedefinir, setARedefinir] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    const concluido = emEdicao
      ? await executar(() => actualizarUtilizadorAdministrativo(emEdicao.id, { nome: valores.nome, apelido: valores.apelido, telefone: valores.telefone, perfil: valores.perfil }), 'Utilizador atualizado com sucesso.')
      : await executar(() => criarUtilizadorAdministrativo(valores), 'Utilizador criado com sucesso.');
    if (concluido) { formulario.reset(); setEmEdicao(null); }
  }

  async function redefinir(novaPalavraPasse) {
    setARedefinir(true);
    const concluido = await executar(() => redefinirPalavraPasseAdministrativa(utilizadorRedefinir.id, novaPalavraPasse), 'Palavra-passe redefinida com sucesso.');
    if (concluido) setUtilizadorRedefinir(null);
    setARedefinir(false);
  }

  return <>
    <form className="admin-formulario admin-formulario-utilizador vidro" onSubmit={guardar} key={emEdicao?.id || 'novo'}>
      <h3>{emEdicao ? 'Editar utilizador' : 'Novo utilizador'}</h3>
      <label>Nome<input name="nome" defaultValue={emEdicao?.nome || ''} required minLength="3" /></label>
      <label>Apelido<input name="apelido" defaultValue={emEdicao?.apelido || ''} required minLength="2" /></label>
      <label>Telefone<input name="telefone" type="tel" defaultValue={emEdicao?.telefone || ''} placeholder="+258840000000" required /></label>
      <label>Perfil<select name="perfil" defaultValue={emEdicao?.perfil || 'PASSAGEIRO'}><option value="PASSAGEIRO">Cliente</option><option value="GESTOR_SUPORTE">Atendente</option><option value="ADMIN">Administrador</option></select></label>
      {!emEdicao && <label>Palavra-passe<input name="palavraPasse" type="password" minLength="8" required /></label>}
      <button>{emEdicao ? 'Guardar alterações' : 'Criar utilizador'}</button>
      {emEdicao && <button type="button" className="botao-voltar" onClick={() => setEmEdicao(null)}>Cancelar edição</button>}
    </form>
    <TabelaGestao titulo="Utilizadores" colunas={['ID', 'Nome', 'Apelido', 'Telefone', 'Perfil', 'Estado', 'Ações']} linhas={utilizadores.map((item) => [item.id, item.nome, item.apelido, item.telefone, nomePerfil(item.perfil), item.activo ? 'Ativo' : 'Inativo', <span className="admin-acoes"><button onClick={() => setEmEdicao(item)}>Editar</button><button onClick={() => setUtilizadorRedefinir(item)}>Redefinir senha</button><BotaoEstado activo={item.activo} aoClicar={() => executar(() => definirEstadoAdministrativo('utilizadores', item.id, !item.activo), 'Estado do utilizador atualizado.')} /></span>])} />
    {utilizadorRedefinir && <ModalCampo titulo="Redefinir palavra-passe" texto={`Defina uma nova palavra-passe para ${nomePessoa(utilizadorRedefinir)}.`} etiquetaCampo="Nova palavra-passe" tipo="password" minLength={8} textoConfirmar="Redefinir" aProcessar={aRedefinir} aoConfirmar={redefinir} aoFechar={() => setUtilizadorRedefinir(null)} />}
  </>;
}

function PaginaGestaoSuporte() {
  const [tickets, setTickets] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [erro, setErro] = useState('');

  function carregar() {
    Promise.all([listarTicketsSuporte(), listarGestoresSuporte()]).then(([listaTickets, listaGestores]) => { setTickets(listaTickets); setGestores(listaGestores); }).catch((falha) => setErro(falha.message));
  }
  useEffect(carregar, []);

  async function atribuir(evento, ticketId) {
    const gestorId = evento.target.value;
    if (!gestorId) return;
    try { await atribuirTicketSuporte(ticketId, gestorId); carregar(); }
    catch (falha) { setErro(falha.message); }
  }

  if (ticketActivo) return <><button className="botao-voltar-suporte" onClick={() => { setTicketActivo(null); carregar(); }}>Voltar aos tickets</button><ChatTicketSuporte ticketId={ticketActivo} perfil="ADMIN" aoActualizar={carregar} /></>;
  return <section className="admin-tabela vidro"><div className="titulo-secao"><div><h3>Gestão de suporte</h3><p>Atribua os pedidos à equipa e acompanhe os atendimentos.</p></div><span>{tickets.length} tickets</span></div>{erro && <p className="mensagem-formulario erro">{erro}</p>}<div className="admin-tabela-scroll"><table><thead><tr><th>Código</th><th>Passageiro</th><th>Assunto</th><th>Prioridade</th><th>Estado</th><th>Gestor responsável</th><th>Ação</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td>{ticket.codigo}</td><td>{nomePessoa(ticket.Passageiro)}</td><td>{ticket.assunto}</td><td>{ticket.prioridade}</td><td><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></td><td><select value={ticket.gestorId || ''} onChange={(evento) => atribuir(evento, ticket.id)}><option value="">Não atribuído</option>{gestores.map((gestor) => <option key={gestor.id} value={gestor.id}>{nomePessoa(gestor)}</option>)}</select></td><td><button className="admin-activar" onClick={() => setTicketActivo(ticket.id)}>Abrir</button></td></tr>)}</tbody></table></div></section>;
}

function PaginaWhatsApp() {
  const [estado, setEstado] = useState(null);
  const [erro, setErro] = useState('');
  const [aProcessar, setAProcessar] = useState(false);
  const [confirmarRenovacao, setConfirmarRenovacao] = useState(false);

  function carregar() {
    obterEstadoWhatsApp().then(setEstado).catch((falha) => setErro(falha.message));
  }

  useEffect(() => {
    carregar();
    const temporizador = setInterval(carregar, 4000);
    return () => clearInterval(temporizador);
  }, []);

  async function ligar(limparSessao = false) {
    setAProcessar(true); setErro('');
    try { setEstado(await iniciarWhatsApp(limparSessao)); if (limparSessao) setConfirmarRenovacao(false); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function repetir(id) {
    setAProcessar(true); setErro('');
    try { await repetirEnvioWhatsapp(id); carregar(); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  return <section className="pagina-whatsapp-admin vidro">
    <div className="titulo-secao"><div><h3>Bot WhatsApp</h3><p>Ligação para códigos OTP e avisos operacionais das viagens.</p></div>{estado && <b className={`estado-whatsapp estado-whatsapp-${estado.estado.toLowerCase()}`}>{nomeEstadoWhatsApp(estado.estado)}</b>}</div>
    {erro && <p className="mensagem-formulario erro">{erro}</p>}
    {!estado ? <div className="painel-carregando">A consultar ligação...</div> : <><div className="conteudo-whatsapp-admin">
      <div className="detalhes-whatsapp">
        <dl><div><dt>Processo PM2</dt><dd>{estado.pm2?.existe ? `${estado.pm2.nome} — ${estado.pm2.estado}` : 'Será criado ao iniciar'}</dd></div><div><dt>Número ligado</dt><dd>{estado.numero ? `+${estado.numero}` : 'Nenhum'}</dd></div><div><dt>Fornecedor OTP</dt><dd>{estado.fornecedorOtp}</dd></div><div><dt>Última alteração</dt><dd>{estado.ultimaAlteracao ? formatarData(estado.ultimaAlteracao) : 'Ainda não iniciado'}</dd></div></dl>
        {estado.fornecedorOtp !== 'WHATSAPP_BAILEYS' && <p className="aviso-whatsapp">A ligação pode ser preparada agora, mas os OTPs continuarão simulados até definir <code>OTP_FORNECEDOR=WHATSAPP_BAILEYS</code> no ficheiro <code>.env</code>.</p>}
        <div className="acoes-whatsapp"><button disabled={aProcessar} onClick={() => ligar(false)}>{aProcessar ? 'A processar...' : ['NAO_INICIADO', 'PROCESSO_PARADO'].includes(estado.estado) ? 'Iniciar bot' : 'Verificar ligação'}</button><button className="botao-renovar-whatsapp" disabled={aProcessar} onClick={() => setConfirmarRenovacao(true)}>Gerar novo QR Code</button></div>
      </div>
      <div className="qr-whatsapp">{estado.qrCodeDataUrl ? <><img src={estado.qrCodeDataUrl} alt="QR Code para ligar o WhatsApp" /><p>No WhatsApp, abra Dispositivos ligados e leia este código.</p></> : estado.ligado ? <><span className="marca-whatsapp-ligado">Ligado</span><p>O número está pronto para entregar OTPs e avisos.</p></> : <><span className="marca-whatsapp-espera">Sem QR Code</span><p>Inicie o bot ou renove a ligação para gerar o código.</p></>}</div>
    </div><section className="fila-whatsapp-admin"><div className="titulo-secao"><div><h3>Fila de entregas</h3><p>OTPs têm prioridade. Avisos são enviados individualmente e repetidos em caso de falha.</p></div></div><div className="indicadores-fila-whatsapp">{Object.entries(estado.fila?.contagens || {}).map(([nome, total]) => <span key={nome}><small>{nomeEstadoEnvio(nome)}</small><strong>{total}</strong></span>)}</div><div className="admin-tabela-scroll"><table><thead><tr><th>Tipo</th><th>Destino</th><th>Estado</th><th>Tentativas</th><th>Viagem</th><th>Ação</th></tr></thead><tbody>{estado.fila?.recentes?.length ? estado.fila.recentes.map((envio) => <tr key={envio.id}><td>{envio.tipo === 'OTP' ? 'OTP' : 'Aviso de viagem'}</td><td>{envio.telefone}</td><td><b className={`estado-envio estado-envio-${envio.estado.toLowerCase()}`}>{nomeEstadoEnvio(envio.estado)}</b></td><td>{envio.tentativas}</td><td>{envio.viagemId || '—'}</td><td>{['FALHADO', 'EXPIRADO'].includes(envio.estado) && envio.tipo !== 'OTP' ? <button disabled={aProcessar} onClick={() => repetir(envio.id)}>Repetir</button> : '—'}</td></tr>) : <tr><td colSpan="6">Ainda não existem entregas.</td></tr>}</tbody></table></div></section></>}
    {confirmarRenovacao && <ModalConfirmacao titulo="Gerar novo QR Code" texto="A sessão guardada será terminada e será necessário ligar novamente o telefone ao sistema." textoConfirmar="Gerar novo código" perigo aProcessar={aProcessar} aoConfirmar={() => ligar(true)} aoFechar={() => setConfirmarRenovacao(false)} />}
  </section>;
}

function PaginaInteligenciaArtificial() {
  const [configuracao, setConfiguracao] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [origemModelos, setOrigemModelos] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [removerApiKey, setRemoverApiKey] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [aProcessar, setAProcessar] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  function carregar() {
    setErro('');
    Promise.all([obterConfiguracaoIa(), listarModelosIa()])
      .then(([configurada, catalogo]) => { setConfiguracao(configurada); setModelos(catalogo.modelos || []); setOrigemModelos(catalogo.origem); })
      .catch((falha) => setErro(falha.message));
  }
  useEffect(carregar, []);

  async function guardar(evento) {
    evento.preventDefault(); setAProcessar(true); setMensagem(''); setErro('');
    try {
      const actualizada = await guardarConfiguracaoIa({ modelo: configuracao.modelo, activo: configuracao.activo, apiKey, removerApiKey });
      setConfiguracao(actualizada); setApiKey(''); setRemoverApiKey(false); setMensagem('Configuração de inteligência artificial guardada com sucesso.');
      const catalogo = await listarModelosIa(); setModelos(catalogo.modelos || []); setOrigemModelos(catalogo.origem);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function testar() {
    setAProcessar(true); setMensagem(''); setErro('');
    try { const resultado = await testarLigacaoIa(); setMensagem(`${resultado.mensagem} Modelo: ${resultado.modelo}.`); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  if (!configuracao) return <section className="pagina-ia-admin vidro"><p>{erro || 'A carregar configuração de inteligência artificial...'}</p></section>;
  const filtrados = modelos.filter((item) => !pesquisa || `${item.nome} ${item.id}`.toLowerCase().includes(pesquisa.toLowerCase())).slice(0, 200);
  const opcoes = filtrados.some((item) => item.id === configuracao.modelo) ? filtrados : [{ id: configuracao.modelo, nome: `${configuracao.modelo} (configurado)`, gratuito: configuracao.modelo.endsWith(':free') }, ...filtrados];

  return <section className="pagina-ia-admin vidro">
    <div className="titulo-secao"><div><h3>Inteligência artificial</h3><p>Configure a OpenRouter utilizada pelo assistente virtual do suporte.</p></div><b className={`estado-ia ${configuracao.activo ? 'estado-ia-activo' : 'estado-ia-inactivo'}`}>{configuracao.activo ? 'Ativa' : 'Inativa'}</b></div>
    {mensagem && <p className="mensagem-formulario sucesso">{mensagem}</p>}{erro && <p className="mensagem-formulario erro">{erro}</p>}
    <form className="formulario-ia" onSubmit={guardar}>
      <label>Fornecedor<input value="OpenRouter" disabled /></label>
      <label className="campo-chave-ia">Chave da API<span className="entrada-chave-ia"><input type={mostrarChave ? 'text' : 'password'} value={apiKey} onChange={(evento) => { setApiKey(evento.target.value); setRemoverApiKey(false); }} placeholder={configuracao.apiKeyConfigurada ? 'Chave configurada — escreva apenas para substituir' : 'sk-or-v1-...'} autoComplete="new-password" /><button type="button" onClick={() => setMostrarChave((valor) => !valor)}>{mostrarChave ? 'Ocultar' : 'Mostrar'}</button></span><small>{configuracao.apiKeyConfigurada ? 'Existe uma chave cifrada guardada.' : 'Ainda não existe uma chave configurada.'}</small></label>
      <label className="campo-pesquisa-modelo">Pesquisar modelo<input value={pesquisa} onChange={(evento) => setPesquisa(evento.target.value)} placeholder="DeepSeek, gratuito, OpenAI..." /></label>
      <label className="campo-modelo-ia">Modelo<select value={configuracao.modelo} onChange={(evento) => setConfiguracao((actual) => ({ ...actual, modelo: evento.target.value }))}>{opcoes.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.gratuito ? ' — gratuito' : ''}</option>)}</select><small>{origemModelos === 'OPENROUTER' ? 'Catálogo atualizado diretamente pela OpenRouter.' : 'Catálogo básico de contingência. Guarde uma chave válida para carregar todos os modelos.'}</small></label>
      <label className="alternador-ia"><input type="checkbox" checked={configuracao.activo} onChange={(evento) => setConfiguracao((actual) => ({ ...actual, activo: evento.target.checked }))} /><span>Utilizar a IA no assistente virtual</span></label>
      {configuracao.apiKeyConfigurada && <label className="alternador-ia remover-chave-ia"><input type="checkbox" checked={removerApiKey} onChange={(evento) => { setRemoverApiKey(evento.target.checked); if (evento.target.checked) setApiKey(''); }} /><span>Remover a chave guardada ao salvar</span></label>}
      <div className="acoes-ia"><button disabled={aProcessar}>{aProcessar ? 'A processar...' : 'Guardar configuração'}</button><button type="button" className="botao-secundario-ia" disabled={aProcessar || !configuracao.apiKeyConfigurada} onClick={testar}>Testar ligação</button></div>
    </form>
    <p className="aviso-ia">Se a IA estiver inativa, sem chave ou temporariamente indisponível, o assistente utiliza automaticamente as respostas frequentes locais.</p>
  </section>;
}

function PaginaAuditoria({ auditorias }) {
  const [filtros, setFiltros] = useState({ utilizador: '', operacao: '', entidade: '', dataInicio: '', dataFim: '' });

  // As opções são obtidas dos próprios registos para evitar filtros sem resultados.
  const administradores = Array.from(new Map(auditorias.filter((item) => item.User).map((item) => [String(item.User.id), nomePessoa(item.User)])).entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'));
  const operacoes = [...new Set(auditorias.map((item) => item.operacao).filter(Boolean))].sort();
  const entidades = [...new Set(auditorias.map((item) => item.entidade).filter(Boolean))].sort();

  const auditoriasFiltradas = auditorias.filter((item) => {
    const autor = item.User ? String(item.User.id) : 'sistema';
    const data = new Date(item.criado_em);
    const inicio = filtros.dataInicio ? new Date(`${filtros.dataInicio}T00:00:00`) : null;
    const fim = filtros.dataFim ? new Date(`${filtros.dataFim}T23:59:59.999`) : null;

    return (!filtros.utilizador || autor === filtros.utilizador)
      && (!filtros.operacao || item.operacao === filtros.operacao)
      && (!filtros.entidade || item.entidade === filtros.entidade)
      && (!inicio || data >= inicio)
      && (!fim || data <= fim);
  });

  function alterarFiltro(evento) {
    setFiltros((actuais) => ({ ...actuais, [evento.target.name]: evento.target.value }));
  }

  function limparFiltros() {
    setFiltros({ utilizador: '', operacao: '', entidade: '', dataInicio: '', dataFim: '' });
  }

  return <>
    <section className="admin-filtros-auditoria vidro" aria-label="Filtros da auditoria">
      <div className="titulo-secao"><div><h3>Filtros da auditoria</h3><p>Combine os campos para localizar uma operação específica.</p></div><span>{auditoriasFiltradas.length} de {auditorias.length} registos</span></div>
      <div className="grelha-filtros-auditoria">
        <label>Administrador<select name="utilizador" value={filtros.utilizador} onChange={alterarFiltro}><option value="">Todos</option>{auditorias.some((item) => !item.User) && <option value="sistema">Sistema</option>}{administradores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
        <label>Operação<select name="operacao" value={filtros.operacao} onChange={alterarFiltro}><option value="">Todas</option>{operacoes.map((operacao) => <option key={operacao} value={operacao}>{operacao}</option>)}</select></label>
        <label>Entidade<select name="entidade" value={filtros.entidade} onChange={alterarFiltro}><option value="">Todas</option>{entidades.map((entidade) => <option key={entidade} value={entidade}>{entidade}</option>)}</select></label>
        <label>Data inicial<input name="dataInicio" type="date" value={filtros.dataInicio} max={filtros.dataFim || undefined} onChange={alterarFiltro} /></label>
        <label>Data final<input name="dataFim" type="date" value={filtros.dataFim} min={filtros.dataInicio || undefined} onChange={alterarFiltro} /></label>
        <button type="button" onClick={limparFiltros} disabled={!Object.values(filtros).some(Boolean)}>Limpar filtros</button>
      </div>
    </section>
    <TabelaGestao key={JSON.stringify(filtros)} titulo="Registo de auditoria" colunas={['Data', 'Administrador', 'Operação', 'Entidade', 'Identificador', 'Endereço IP', 'Valores']} linhas={auditoriasFiltradas.map((item) => [formatarData(item.criado_em), item.User ? nomePessoa(item.User) : 'Sistema', item.operacao, item.entidade, item.entidadeId || '—', item.enderecoIp || '—', JSON.stringify(item.valoresNovos || {})])} />
  </>;
}

function FormularioAutocarro({ aoSubmeter }) { return <form className="admin-formulario vidro" onSubmit={aoSubmeter}><h3>Novo autocarro</h3><label>Matrícula<input name="matricula" required /></label><label>Modelo<input name="modelo" required /></label><label>Capacidade<input name="capacidade" type="number" min="1" required /></label><button>Adicionar autocarro</button></form>; }
function FormularioRota({ aoSubmeter }) { return <form className="admin-formulario vidro" onSubmit={aoSubmeter}><h3>Nova rota</h3><label>Origem<input name="origem" required /></label><label>Destino<input name="destino" required /></label><label>Distância em km<input name="distanciaKm" type="number" min="1" /></label><button>Adicionar rota</button></form>; }
function FormularioViagem({ rotas, autocarros, aoSubmeter }) { return <form className="admin-formulario admin-formulario-viagem vidro" onSubmit={aoSubmeter}><h3>Nova viagem</h3><label>Rota<select name="rotaId" required><option value="">Selecionar</option>{rotas.map((item) => <option key={item.id} value={item.id}>{item.origin} → {item.destination}</option>)}</select></label><label>Autocarro<select name="autocarroId" required><option value="">Selecionar</option>{autocarros.map((item) => <option key={item.id} value={item.id}>{item.registration} · {item.model}</option>)}</select></label><label>Partida<input name="partidaEm" type="datetime-local" required /></label><label>Chegada prevista<input name="chegadaPrevistaEm" type="datetime-local" /></label><label>Preço<input name="preco" type="number" min="1" required /></label><button>Agendar viagem</button></form>; }

function AcoesViagem({ viagem, executar }) {
  const [editarPreco, setEditarPreco] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [enviarAviso, setEnviarAviso] = useState(false);
  const [aProcessar, setAProcessar] = useState(false);

  async function editar(preco) {
    setAProcessar(true);
    const concluido = await executar(() => actualizarViagemAdministrativa(viagem.id, { preco: Number(preco) }), 'Preço da viagem atualizado.');
    if (concluido) setEditarPreco(false);
    setAProcessar(false);
  }
  async function cancelar() {
    setAProcessar(true);
    const concluido = await executar(() => cancelarViagemAdministrativa(viagem.id), 'Viagem cancelada com sucesso.');
    if (concluido) setConfirmarCancelamento(false);
    setAProcessar(false);
  }
  async function avisar(mensagem) {
    setAProcessar(true);
    const concluido = await executar(() => enviarAvisoViagemAdministrativa(viagem.id, mensagem), 'Avisos adicionados à fila do WhatsApp.');
    if (concluido) setEnviarAviso(false);
    setAProcessar(false);
  }
  return <><span className="admin-acoes"><button onClick={() => setEditarPreco(true)}>Editar preço</button>{viagem.status === 'AGENDADA' && <><button onClick={() => setEnviarAviso(true)}>Enviar aviso</button><button className="admin-desactivar" onClick={() => setConfirmarCancelamento(true)}>Cancelar</button></>}</span>{editarPreco && <ModalCampo titulo="Editar preço da viagem" texto="O novo preço será utilizado nas próximas compras desta viagem." etiquetaCampo="Novo preço" tipo="number" min="1" step="0.01" valorInicial={String(viagem.price)} textoConfirmar="Guardar preço" aProcessar={aProcessar} aoConfirmar={editar} aoFechar={() => setEditarPreco(false)} />}{enviarAviso && <ModalCampo titulo="Avisar passageiros" texto="O aviso será entregue pelo WhatsApp a todos os clientes com bilhete ativo nesta viagem." etiquetaCampo="Mensagem do aviso" multilinha minLength={10} maxLength={1000} textoConfirmar="Colocar na fila" aProcessar={aProcessar} aoConfirmar={avisar} aoFechar={() => setEnviarAviso(false)} />}{confirmarCancelamento && <ModalConfirmacao titulo="Cancelar viagem" texto="Os bilhetes ativos serão cancelados, os pagamentos ficarão marcados como reembolsados na simulação e todos os passageiros serão avisados pelo WhatsApp." textoConfirmar="Cancelar e avisar" perigo aProcessar={aProcessar} aoConfirmar={cancelar} aoFechar={() => setConfirmarCancelamento(false)} />}</>;
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
function formatarData(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)); }
function nomePerfil(perfil) { return { PASSAGEIRO: 'Cliente', GESTOR_SUPORTE: 'Atendente', ADMIN: 'Administrador' }[perfil] || perfil; }
function nomePessoa(pessoa) { return pessoa ? `${pessoa.nome || ''} ${pessoa.apelido || ''}`.trim() : '—'; }
function nomeEstadoWhatsApp(estado) { return { NAO_INICIADO: 'Não iniciado', PROCESSO_PARADO: 'Processo parado', ERRO_PROCESSO: 'Erro no processo', A_LIGAR: 'A ligar', AGUARDA_QR: 'Aguarda QR Code', LIGADO: 'Ligado', A_RECONECTAR: 'A reconectar', SESSAO_TERMINADA: 'Sessão terminada', ERRO_RECONEXAO: 'Falha na reconexão' }[estado] || estado; }
function nomeEstadoEnvio(estado) { return { PENDENTE: 'Pendente', PROCESSANDO: 'A enviar', ENVIADO: 'Enviado', FALHADO: 'Falhado', EXPIRADO: 'Expirado' }[estado] || estado; }
