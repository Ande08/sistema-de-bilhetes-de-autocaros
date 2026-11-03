import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import ChatTicketSuporte, { traduzirEstado } from './ChatTicketSuporte.jsx';
import { ModalCampo, ModalConfirmacao } from './Modal.jsx';
import SelecaoLocalidade from './SelecaoLocalidade.jsx';
import PaginaContaUtilizador from './PaginaContaUtilizador.jsx';
import { URL_SERVIDOR, actualizarCupaoAdministrativo, actualizarEmpresaAdministrativa, actualizarUtilizadorAdministrativo, actualizarViagemAdministrativa, alterarPalavraPasse, atribuirTicketSuporte, cancelarViagemAdministrativa, criarAutocarro, criarCupaoAdministrativo, criarEmpresaAdministrativa, criarRota, criarUtilizadorAdministrativo, criarViagem, decidirCadastroEmpresaAdministrativa, definirEstadoAdministrativo, definirEstadoCupaoAdministrativo, definirEstadoEmpresaAdministrativa, editarEmpresaAdministrativa, eliminarEmpresaAdministrativa, eliminarUtilizadorAdministrativo, enviarAvisoViagemAdministrativa, guardarConfiguracaoIa, iniciarWhatsApp, listarGestoresSuporte, listarModelosIa, listarTicketsSuporte, obterAnaliseAssistenteEmpresa, obterConfiguracaoIa, obterEstadoWhatsApp, obterPainelAdministrativo, perguntarAssistenteEmpresa, redefinirPalavraPasseAdministrativa, repetirEnvioWhatsapp, solicitarOtpAlteracaoPalavraPasse, testarLigacaoIa } from '../servicos/api.js';
import { formatarValor } from '../utilitarios/moeda.js';

const secoesPlataforma = ['Visão geral', 'Empresas', 'Administradores', 'Volume de vendas', 'Inteligência artificial', 'WhatsApp', 'Auditoria', 'Minha conta'];
const secoesEmpresa = ['Dados da empresa', 'Visão geral', 'Assistente IA', 'Atendentes', 'Autocarros', 'Rotas', 'Viagens', 'Cupões', 'Bilhetes', 'Suporte', 'Minha conta'];

export default function PainelAdministrador({ utilizador, aoSair, aoActualizarUtilizador }) {
  const secoes = utilizador.perfil === 'ADMIN' ? secoesPlataforma : secoesEmpresa;
  const [secao, setSecao] = useState(utilizador.perfil === 'EMPRESA_ADMIN' ? 'Dados da empresa' : 'Visão geral');
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
    const dadosFormulario = new FormData(formulario);
    const valores = Object.fromEntries(dadosFormulario);
    // FormData exige getAll para preservar os vários dias marcados na recorrência semanal.
    const diasSemana = dadosFormulario.getAll('diasSemana');
    if (diasSemana.length) valores.diasSemana = diasSemana.map(Number);
    if (valores.capacidade) valores.capacidade = Number(valores.capacidade);
    if (valores.lugaresEsquerda) valores.lugaresEsquerda = Number(valores.lugaresEsquerda);
    if (valores.lugaresDireita) valores.lugaresDireita = Number(valores.lugaresDireita);
    const concluido = await executar(() => criador(valores), mensagemSucesso);
    if (concluido) formulario.reset();
  }

  const empresaPainel = dados?.empresa || utilizador.empresa;
  const logoEmpresa = empresaPainel?.logoUrl ? `${URL_SERVIDOR}${empresaPainel.logoUrl}` : null;

  return <div className="admin-aplicacao">
    <aside className="admin-lateral">
      <div className="logotipo"><span className={`logotipo-icone ${logoEmpresa ? 'com-imagem' : ''}`}>{logoEmpresa ? <img src={logoEmpresa} alt={`Logótipo da ${empresaPainel.nome}`} /> : <Icone nome="autocarro" />}</span><div><strong>{empresaPainel?.nome || 'Viagem Bus'}</strong><small>Administração</small></div></div>
      <nav>{secoes.map((item) => <button key={item} className={secao === item ? 'ativo' : ''} onClick={() => setSecao(item)}>{item}</button>)}</nav>
      <button className="admin-sair" onClick={aoSair}>Terminar sessão</button>
    </aside>
    <main className="admin-conteudo">
      <header className="admin-topo"><div><p>{utilizador.empresa?.nome || 'Painel da plataforma'}</p><h1>{secao}</h1></div><div className="perfil-topo"><span className="avatar">{utilizador.nome.charAt(0)}</span><div><strong>{nomePessoa(utilizador)}</strong><small>Administrador</small></div></div></header>
      {mensagem && <p className="mensagem-formulario sucesso">{mensagem}</p>}{erro && <p className="mensagem-formulario erro">{erro}</p>}
      {!dados ? <div className="painel-carregando vidro">A carregar informações administrativas...</div> : <ConteudoAdministrativo secao={secao} dados={dados} executar={executar} submeter={submeter} utilizador={utilizador} aoActualizarUtilizador={aoActualizarUtilizador} />}
    </main>
  </div>;
}

function ConteudoAdministrativo({ secao, dados, executar, submeter, utilizador, aoActualizarUtilizador }) {
  if (secao === 'Dados da empresa') return <PaginaDadosEmpresa empresa={dados.empresa} executar={executar} />;
  if (secao === 'Empresas') return <PaginaEmpresas empresas={dados.empresas || []} executar={executar} />;
  if (secao === 'Administradores') return <PaginaUtilizadores utilizadores={dados.passageiros} empresas={dados.empresas || []} executar={executar} administrador={utilizador} />;
  if (secao === 'Atendentes') return <PaginaUtilizadores utilizadores={dados.passageiros.filter((item) => item.perfil === 'GESTOR_SUPORTE')} executar={executar} administrador={utilizador} />;
  if (secao === 'Volume de vendas') return <TabelaGestao titulo="Volume de vendas por empresa" colunas={['Empresa', 'Emitidos', 'Utilizados', 'Cancelados', 'Total válido']} linhas={(dados.volumeVendas || []).map((item) => [item.empresa, item.emitidos, item.utilizados, item.cancelados, item.total])} />;
  if (secao === 'Autocarros') return <><FormularioAutocarro aoSubmeter={(e) => submeter(e, criarAutocarro, 'Autocarro criado com sucesso.')} /><TabelaGestao titulo="Frota" colunas={['ID', 'Matrícula', 'Modelo', 'Capacidade', 'Distribuição', 'Estado', 'Criado em', 'Ação']} linhas={dados.autocarros.map((item) => [item.id, item.registration, item.model, item.capacity, `${item.seatsLeft || 2} + ${item.seatsRight || 2}`, item.active ? 'Ativo' : 'Inativo', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('autocarros', item.id, !item.active), 'Estado do autocarro atualizado.')} />])} /></>;
  if (secao === 'Rotas') return <><FormularioRota aoSubmeter={(e) => submeter(e, criarRota, 'Rota criada com sucesso.')} /><TabelaGestao titulo="Rotas" colunas={['ID', 'Origem', 'Destino', 'Distância', 'Estado', 'Criada em', 'Ação']} linhas={dados.rotas.map((item) => [item.id, `${item.origin} (${item.originProvince})`, `${item.destination} (${item.destinationProvince})`, item.distanceKm ? `${item.distanceKm} km` : '—', item.active ? 'Ativa' : 'Inativa', formatarData(item.criado_em), <BotaoEstado activo={item.active} aoClicar={() => executar(() => definirEstadoAdministrativo('rotas', item.id, !item.active), 'Estado da rota atualizado.')} />])} /></>;
  if (secao === 'Viagens') return <><FormularioViagem rotas={dados.rotas.filter((item) => item.active)} autocarros={dados.autocarros.filter((item) => item.active)} aoSubmeter={(e) => submeter(e, criarViagem, 'Agendamento criado com sucesso.')} /><TabelaGestao titulo="Viagens" colunas={['ID', 'Rota', 'Autocarro', 'Frequência', 'Partida', 'Chegada', 'Preço', 'Estado', 'Ações']} linhas={dados.viagens.map((item) => [item.id, `${item.Route?.origin} → ${item.Route?.destination}`, `${item.Bus?.registration || '—'} · ${item.Bus?.model || ''}`, descreverFrequencia(item), formatarData(item.departureAt), item.arrivalExpectedAt ? formatarData(item.arrivalExpectedAt) : '—', formatarValor(item.price), item.status, <AcoesViagem viagem={item} executar={executar} />])} /></>;
  if (secao === 'Cupões') return <PaginaCupons cupoes={dados.cupoes || []} executar={executar} />;
  if (secao === 'Bilhetes') return <TabelaGestao titulo="Bilhetes emitidos" colunas={['Código', 'Passageiro', 'Rota', 'Autocarro', 'Assento', 'Pagamento', 'Referência', 'Cupão', 'Desconto', 'Preço', 'Estado', 'Emitido em']} linhas={dados.bilhetes.map((item) => [item.codigo, item.User ? nomePessoa(item.User) : item.nomePassageiro, `${item.Trip?.Route?.origin || ''} → ${item.Trip?.Route?.destination || ''}`, item.Trip?.Bus?.registration || '—', item.Assento?.numero || '—', item.Pagamento?.metodo || '—', item.Pagamento?.referencia || '—', item.Cupao?.codigo || '—', formatarValor(item.desconto || 0), formatarValor(item.preco), item.estado, formatarData(item.criado_em)])} />;
  if (secao === 'Suporte') return <PaginaGestaoSuporte />;
  if (secao === 'Inteligência artificial') return <PaginaInteligenciaArtificial />;
  if (secao === 'Assistente IA') return <PaginaAssistenteEmpresa />;
  if (secao === 'WhatsApp') return <PaginaWhatsApp />;
  if (secao === 'Auditoria' && utilizador.perfil === 'ADMIN') return <PaginaAuditoria auditorias={dados.auditorias} />;
  if (secao === 'Minha conta') return <PaginaContaUtilizador utilizador={utilizador} aoActualizarUtilizador={aoActualizarUtilizador} />;
  return <VisaoGeral dados={dados} />;
}

function PaginaCupons({ cupoes, executar }) {
  const [emEdicao, setEmEdicao] = useState(null);

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    const dados = {
      ...valores,
      codigo: valores.codigo.toUpperCase(),
      percentagem: Number(valores.percentagem),
      valorMinimo: Number(valores.valorMinimo || 0),
      limiteUtilizacoes: valores.limiteUtilizacoes ? Number(valores.limiteUtilizacoes) : null,
      limitePorUtilizador: Number(valores.limitePorUtilizador || 1)
    };
    const concluido = emEdicao
      ? await executar(() => actualizarCupaoAdministrativo(emEdicao.id, dados), 'Cupão atualizado com sucesso.')
      : await executar(() => criarCupaoAdministrativo(dados), 'Cupão criado com sucesso.');
    if (concluido) { formulario.reset(); setEmEdicao(null); }
  }

  return <>
    <form className="admin-formulario admin-formulario-cupao vidro" onSubmit={guardar} key={emEdicao?.id || 'novo-cupao'}>
      <div className="cabecalho-formulario-empresa"><h3>{emEdicao ? 'Editar cupão' : 'Novo cupão'}</h3><p>Defina a validade, o desconto e limites para controlar a campanha.</p></div>
      <label>Código<input name="codigo" defaultValue={emEdicao?.codigo || ''} minLength="3" maxLength="30" pattern="[A-Za-z0-9_-]+" placeholder="FERIAS10" required /></label>
      <label>Descrição<input name="descricao" defaultValue={emEdicao?.descricao || ''} maxLength="200" placeholder="Campanha de férias" /></label>
      <label>Desconto percentual<input name="percentagem" type="number" min="1" max="90" step="0.01" defaultValue={emEdicao?.percentagem || 10} required /></label>
      <label>Compra mínima em MT<input name="valorMinimo" type="number" min="0" step="0.01" defaultValue={emEdicao?.valorMinimo || 0} /></label>
      <label>Válido desde<input name="validoDe" type="datetime-local" defaultValue={formatarDataFormulario(emEdicao?.validoDe)} required /></label>
      <label>Válido até<input name="validoAte" type="datetime-local" defaultValue={formatarDataFormulario(emEdicao?.validoAte)} required /></label>
      <label>Limite total<input name="limiteUtilizacoes" type="number" min="1" defaultValue={emEdicao?.limiteUtilizacoes || ''} placeholder="Sem limite" /></label>
      <label>Limite por cliente<input name="limitePorUtilizador" type="number" min="1" defaultValue={emEdicao?.limitePorUtilizador || 1} required /></label>
      <button>{emEdicao ? 'Guardar alterações' : 'Criar cupão'}</button>
      {emEdicao && <button type="button" className="botao-voltar" onClick={() => setEmEdicao(null)}>Cancelar edição</button>}
    </form>
    <TabelaGestao titulo="Cupões da empresa" colunas={['Código', 'Desconto', 'Validade', 'Compra mínima', 'Utilizações', 'Por cliente', 'Estado', 'Ações']} linhas={cupoes.map((cupao) => [
      cupao.codigo,
      `${Number(cupao.percentagem)}%`,
      `${formatarData(cupao.validoDe)} — ${formatarData(cupao.validoAte)}`,
      formatarValor(cupao.valorMinimo),
      `${cupao.totalUtilizacoes}/${cupao.limiteUtilizacoes || '∞'}`,
      cupao.limitePorUtilizador,
      estadoCupao(cupao),
      <span className="admin-acoes"><button onClick={() => setEmEdicao(cupao)}>Editar</button><BotaoEstado activo={cupao.activo} aoClicar={() => executar(() => definirEstadoCupaoAdministrativo(cupao.id, !cupao.activo), `Cupão ${cupao.activo ? 'desativado' : 'ativado'} com sucesso.`)} /></span>
    ])} />
  </>;
}

function PaginaAssistenteEmpresa() {
  const [analise, setAnalise] = useState(null);
  const [mensagens, setMensagens] = useState([{ autor: 'IA', texto: 'Posso analisar volume financeiro, procura por rota e oportunidades de campanha usando apenas os dados desta empresa.' }]);
  const [erro, setErro] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  useEffect(() => { obterAnaliseAssistenteEmpresa().then(setAnalise).catch((falha) => setErro(falha.message)); }, []);

  async function perguntar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const pergunta = new FormData(formulario).get('pergunta').trim();
    if (!pergunta) return;
    setMensagens((itens) => [...itens, { autor: 'ADMIN', texto: pergunta }]);
    formulario.reset(); setAProcessar(true); setErro('');
    try {
      const resultado = await perguntarAssistenteEmpresa(pergunta);
      setAnalise(resultado.analise);
      setMensagens((itens) => [...itens, { autor: 'IA', texto: resultado.resposta }]);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  return <section className="pagina-assistente-empresa">
    {analise && <div className="indicadores-assistente-empresa">{[
      ['Viagens agendadas', analise.indicadores.viagensAgendadas],
      ['Bilhetes aprovados', analise.indicadores.bilhetesVendidos],
      ['Volume aprovado', formatarValor(analise.indicadores.volumeAprovado)],
      ['Valor médio', formatarValor(analise.indicadores.valorMedio)]
    ].map(([titulo, valor]) => <article className="vidro" key={titulo}><small>{titulo}</small><strong>{valor}</strong></article>)}</div>}
    <div className="grelha-assistente-empresa">
      <article className="chat-assistente-empresa vidro"><header><div><h3>Assistente analítico</h3><small>Dados confirmados e limitados à sua empresa</small></div><span>Escopo privado</span></header><div className="mensagens-assistente-empresa">{mensagens.map((item, indice) => <p key={indice} className={item.autor === 'IA' ? 'resposta-ia' : 'pergunta-utilizador'}>{item.texto}</p>)}</div><form onSubmit={perguntar}><input name="pergunta" maxLength="1000" placeholder="Ex.: Em que rotas devo fazer campanhas?" required /><button disabled={aProcessar}>{aProcessar ? 'A analisar...' : 'Perguntar'}</button></form>{erro && <p className="mensagem-formulario erro">{erro}</p>}</article>
      <aside className="recomendacoes-assistente vidro"><h3>Recomendações atuais</h3>{analise?.recomendacoes?.map((item) => <p key={item}>{item}</p>)}<h3>Rotas com maior procura</h3>{analise?.melhoresRotas?.length ? analise.melhoresRotas.map((item) => <div key={item.rota}><strong>{item.rota}</strong><small>{item.bilhetes} bilhetes · {formatarValor(item.volume)}</small></div>) : <p>Ainda não existem dados suficientes.</p>}<small className="nota-privacidade-assistente">Nenhum dado de outra empresa ou informação pessoal de clientes é utilizado neste relatório.</small></aside>
    </div>
  </section>;
}

function PaginaSegurancaConta() {
  const [mostrarNova, setMostrarNova] = useState(false);
  const [pedidoOtp, setPedidoOtp] = useState(null);
  const [erroLocal, setErroLocal] = useState('');
  const [mensagemLocal, setMensagemLocal] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  async function solicitarCodigo() {
    setAProcessar(true); setErroLocal(''); setMensagemLocal('');
    try {
      const pedido = await solicitarOtpAlteracaoPalavraPasse();
      setPedidoOtp(pedido);
      setMensagemLocal(pedido.mensagem);
    } catch (falha) { setErroLocal(falha.message); }
    finally { setAProcessar(false); }
  }

  async function guardar(evento) {
    evento.preventDefault();
    setErroLocal(''); setMensagemLocal('');
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    if (valores.novaPalavraPasse !== valores.confirmarPalavraPasse) {
      setErroLocal('A confirmação da nova palavra-passe não corresponde.');
      return;
    }
    setAProcessar(true);
    try {
      const resposta = await alterarPalavraPasse({ codigo: valores.codigo, novaPalavraPasse: valores.novaPalavraPasse });
      formulario.reset(); setPedidoOtp(null); setMensagemLocal(resposta.mensagem);
    } catch (falha) { setErroLocal(falha.message); }
    finally { setAProcessar(false); }
  }

  return <section className="pagina-dados vidro">
    <p className="etiqueta">Segurança da conta</p><h3>Alterar palavra-passe</h3>
    <p>Enviaremos um código de segurança para o WhatsApp associado à sua conta.</p>
    {!pedidoOtp && <button type="button" className="botao-pesquisar" disabled={aProcessar} onClick={solicitarCodigo}>{aProcessar ? 'A enviar...' : 'Enviar código pelo WhatsApp'}</button>}
    {pedidoOtp && <form className="formulario-perfil" onSubmit={guardar}>
      <label>Código recebido no WhatsApp<input className="campo-otp" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required /></label>
      {pedidoOtp.codigoDemonstracao && <p className="codigo-demonstracao">Código de demonstração: <strong>{pedidoOtp.codigoDemonstracao}</strong></p>}
      <label>Nova palavra-passe<span className="campo-palavra-passe"><input name="novaPalavraPasse" type={mostrarNova ? 'text' : 'password'} autoComplete="new-password" minLength="8" required /><button type="button" aria-label={mostrarNova ? 'Ocultar nova palavra-passe' : 'Mostrar nova palavra-passe'} title={mostrarNova ? 'Ocultar' : 'Mostrar'} onClick={() => setMostrarNova((valor) => !valor)}><Icone nome={mostrarNova ? 'olhoFechado' : 'olho'} /></button></span></label>
      <label>Confirmar nova palavra-passe<input name="confirmarPalavraPasse" type={mostrarNova ? 'text' : 'password'} autoComplete="new-password" minLength="8" required /></label>
      <button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A alterar...' : 'Confirmar nova palavra-passe'}</button>
      <button type="button" className="botao-voltar" disabled={aProcessar} onClick={solicitarCodigo}>Reenviar código</button>
    </form>}
    {mensagemLocal && <p className="mensagem-formulario sucesso">{mensagemLocal}</p>}
    {erroLocal && <p className="mensagem-formulario erro">{erroLocal}</p>}
  </section>;
}

function VisaoGeral({ dados }) {
  if (dados.tipoPainel === 'PLATAFORMA') {
    const itensPlataforma = [['autocarro', 'Empresas ativas', dados.indicadores.empresasActivas], ['autocarro', 'Cadastros pendentes', dados.indicadores.empresasPendentes], ['utilizador', 'Usuários ativos', dados.indicadores.usuariosActivos], ['bilhete', 'Vendas hoje', dados.indicadores.vendasHoje], ['bilhete', 'Vendas no mês', dados.indicadores.vendasMes], ['viagens', 'Viagens agendadas', dados.indicadores.viagensAgendadas]];
    return <><section className="admin-indicadores">{itensPlataforma.map(([icone, titulo, valor]) => <article className="vidro" key={titulo}><span className="resumo-icone"><Icone nome={icone} /></span><small>{titulo}</small><strong>{valor}</strong></article>)}</section><TabelaGestao titulo="Volume de vendas por empresa" colunas={['Empresa', 'Emitidos', 'Utilizados', 'Cancelados', 'Total válido']} linhas={(dados.volumeVendas || []).map((item) => [item.empresa, item.emitidos, item.utilizados, item.cancelados, item.total])} /></>;
  }
  const itens = [['utilizador', 'Passageiros', dados.indicadores.passageiros], ['autocarro', 'Autocarros ativos', dados.indicadores.autocarrosActivos], ['viagens', 'Viagens agendadas', dados.indicadores.viagensAgendadas], ['bilhete', 'Bilhetes emitidos', dados.indicadores.bilhetesEmitidos], ['cartao', 'Receita aprovada', formatarValor(dados.indicadores.receitaAprovada)]];
  return <><section className="admin-indicadores">{itens.map(([icone, titulo, valor]) => <article className="vidro" key={titulo}><span className="resumo-icone"><Icone nome={icone} /></span><small>{titulo}</small><strong>{valor}</strong></article>)}</section><TabelaGestao titulo="Viagens recentes" colunas={['Rota', 'Partida', 'Preço', 'Estado']} linhas={dados.viagens.slice(0, 6).map((item) => [`${item.Route?.origin} → ${item.Route?.destination}`, formatarData(item.departureAt), formatarValor(item.price), item.status])} /></>;
}

function PaginaUtilizadores({ utilizadores, empresas = [], executar, administrador }) {
  const administraPlataforma = administrador.perfil === 'ADMIN';
  const designacao = administraPlataforma ? 'administrador' : 'atendente';
  const [emEdicao, setEmEdicao] = useState(null);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(administraPlataforma ? 'ADMIN' : 'GESTOR_SUPORTE');
  const [utilizadorRedefinir, setUtilizadorRedefinir] = useState(null);
  const [utilizadorEliminar, setUtilizadorEliminar] = useState(null);
  const [aRedefinir, setARedefinir] = useState(false);
  const [aEliminar, setAEliminar] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    const concluido = emEdicao
      ? await executar(() => actualizarUtilizadorAdministrativo(emEdicao.id, { nome: valores.nome, apelido: valores.apelido, telefone: valores.telefone, perfil: valores.perfil, empresaId: valores.empresaId || null }), `${designacao === 'atendente' ? 'Atendente atualizado' : 'Administrador atualizado'} com sucesso.`)
      : await executar(() => criarUtilizadorAdministrativo(valores), `${designacao === 'atendente' ? 'Atendente criado' : 'Administrador criado'} com sucesso.`);
    if (concluido) { formulario.reset(); setEmEdicao(null); setPerfilSeleccionado(administraPlataforma ? 'ADMIN' : 'GESTOR_SUPORTE'); }
  }

  async function redefinir(novaPalavraPasse) {
    setARedefinir(true);
    const concluido = await executar(() => redefinirPalavraPasseAdministrativa(utilizadorRedefinir.id, novaPalavraPasse), 'Palavra-passe redefinida com sucesso.');
    if (concluido) setUtilizadorRedefinir(null);
    setARedefinir(false);
  }

  async function eliminar() {
    setAEliminar(true);
    const concluido = await executar(() => eliminarUtilizadorAdministrativo(utilizadorEliminar.id), 'Usuário eliminado com sucesso.');
    if (concluido) setUtilizadorEliminar(null);
    setAEliminar(false);
  }

  const colunas = administraPlataforma
    ? ['ID', 'Nome', 'Apelido', 'Telefone', 'Perfil', 'Empresa', 'Estado', 'Ações']
    : ['ID', 'Nome', 'Apelido', 'Telefone', 'Perfil', 'Estado', 'Ações'];
  const linhas = utilizadores.map((item) => {
    const base = [item.id, item.nome, item.apelido, item.telefone, nomePerfil(item.perfil)];
    if (administraPlataforma) base.push(item.Empresa?.nome || (item.perfil === 'ADMIN' ? 'Plataforma' : '—'));
    base.push(item.activo ? 'Ativo' : 'Inativo', <span className="admin-acoes"><button onClick={() => { setEmEdicao(item); setPerfilSeleccionado(item.perfil); }}>Editar</button><button onClick={() => setUtilizadorRedefinir(item)}>Redefinir senha</button><BotaoEstado activo={item.activo} aoClicar={() => executar(() => definirEstadoAdministrativo('utilizadores', item.id, !item.activo), 'Estado do usuário atualizado.')} /><button className="admin-eliminar" onClick={() => setUtilizadorEliminar(item)}>Eliminar</button></span>);
    return base;
  });

  return <>
    <form className="admin-formulario admin-formulario-utilizador vidro" onSubmit={guardar} key={emEdicao?.id || 'novo'}>
      <h3>{emEdicao ? `Editar ${designacao}` : `Novo ${designacao}`}</h3>
      {!administraPlataforma && <p>O atendente poderá vender bilhetes da empresa e responder aos pedidos de suporte que lhe forem atribuídos.</p>}
      <label>Nome<input name="nome" defaultValue={emEdicao?.nome || ''} required minLength="3" /></label>
      <label>Apelido<input name="apelido" defaultValue={emEdicao?.apelido || ''} required minLength="2" /></label>
      <label>Telefone<input name="telefone" type="tel" defaultValue={emEdicao?.telefone || ''} placeholder="+258840000000" required /></label>
      {administraPlataforma ? <label>Perfil<select name="perfil" value={perfilSeleccionado} onChange={(evento) => setPerfilSeleccionado(evento.target.value)}><option value="ADMIN">Administrador da plataforma</option><option value="EMPRESA_ADMIN">Administrador da empresa</option></select></label> : <input type="hidden" name="perfil" value="GESTOR_SUPORTE" />}
      {administraPlataforma && perfilSeleccionado === 'EMPRESA_ADMIN' && <label>Empresa<select name="empresaId" defaultValue={emEdicao?.empresaId || ''} required><option value="">Selecionar empresa</option>{empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}</select></label>}
      {!emEdicao && <label>Palavra-passe<input name="palavraPasse" type="password" minLength="8" required /></label>}
      <button>{emEdicao ? 'Guardar alterações' : `Criar ${designacao}`}</button>
      {emEdicao && <button type="button" className="botao-voltar" onClick={() => { setEmEdicao(null); setPerfilSeleccionado(administraPlataforma ? 'ADMIN' : 'GESTOR_SUPORTE'); }}>Cancelar edição</button>}
    </form>
    <TabelaGestao titulo={administraPlataforma ? 'Administradores da plataforma e das empresas' : 'Atendentes da empresa'} colunas={colunas} linhas={linhas} />
    {utilizadorRedefinir && <ModalCampo titulo="Redefinir palavra-passe" texto={`Defina uma nova palavra-passe para ${nomePessoa(utilizadorRedefinir)}.`} etiquetaCampo="Nova palavra-passe" tipo="password" minLength={8} textoConfirmar="Redefinir" aProcessar={aRedefinir} aoConfirmar={redefinir} aoFechar={() => setUtilizadorRedefinir(null)} />}
    {utilizadorEliminar && <ModalConfirmacao titulo="Eliminar usuário" texto={`Deseja eliminar ${nomePessoa(utilizadorEliminar)}? A conta será anonimizada e perderá o acesso, mas o histórico de bilhetes, pagamentos, suporte e auditoria será preservado.`} textoConfirmar="Eliminar usuário" perigo aProcessar={aEliminar} aoConfirmar={eliminar} aoFechar={() => setUtilizadorEliminar(null)} />}
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

  if (ticketActivo) return <><button className="botao-voltar-suporte" onClick={() => { setTicketActivo(null); carregar(); }}>Voltar aos tickets</button><ChatTicketSuporte ticketId={ticketActivo} perfil="EMPRESA_ADMIN" aoActualizar={carregar} /></>;
  return <section className="admin-tabela vidro"><div className="titulo-secao"><div><h3>Gestão de suporte</h3><p>Atribua os pedidos à equipa e acompanhe os atendimentos.</p></div><span>{tickets.length} tickets</span></div>{erro && <p className="mensagem-formulario erro">{erro}</p>}<div className="admin-tabela-scroll"><table><thead><tr><th>Código</th><th>Bilhete</th><th>Passageiro</th><th>Assunto</th><th>Prioridade automática</th><th>Estado</th><th>Gestor responsável</th><th>Ação</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td>{ticket.codigo}</td><td>{ticket.Bilhete?.codigo || '—'}</td><td>{nomePessoa(ticket.Passageiro)}</td><td>{ticket.assunto}</td><td><span className="prioridade-ticket"><strong>{ticket.prioridade} · {ticket.prioridadePontuacao}/100</strong><small>{ticket.prioridadeMotivo}</small></span></td><td><b className={`estado-suporte estado-${ticket.estado.toLowerCase()}`}>{traduzirEstado(ticket.estado)}</b></td><td><select value={ticket.gestorId || ''} onChange={(evento) => atribuir(evento, ticket.id)}><option value="">Não atribuído</option>{gestores.map((gestor) => <option key={gestor.id} value={gestor.id}>{nomePessoa(gestor)}</option>)}</select></td><td><button className="admin-activar" onClick={() => setTicketActivo(ticket.id)}>Abrir</button></td></tr>)}</tbody></table></div></section>;
}

function PaginaEmpresas({ empresas, executar }) {
  const [emEdicao, setEmEdicao] = useState(null);
  const [empresaEliminar, setEmpresaEliminar] = useState(null);
  const [empresaRejeitar, setEmpresaRejeitar] = useState(null);
  const [aProcessar, setAProcessar] = useState(false);

  async function criar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));
    const concluido = await executar(() => criarEmpresaAdministrativa(dados), 'Empresa e administrador responsável criados com sucesso.');
    if (concluido) formulario.reset();
  }

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));
    const concluido = await executar(() => editarEmpresaAdministrativa(emEdicao.id, dados), 'Empresa atualizada com sucesso.');
    if (concluido) { formulario.reset(); setEmEdicao(null); }
  }

  async function eliminar() {
    setAProcessar(true);
    const concluido = await executar(() => eliminarEmpresaAdministrativa(empresaEliminar.id), 'Empresa eliminada com sucesso.');
    if (concluido) setEmpresaEliminar(null);
    setAProcessar(false);
  }

  async function rejeitar(motivo) {
    setAProcessar(true);
    const concluido = await executar(() => decidirCadastroEmpresaAdministrativa(empresaRejeitar.id, 'REJEITADA', motivo), 'Cadastro da empresa rejeitado.');
    if (concluido) setEmpresaRejeitar(null);
    setAProcessar(false);
  }

  return <>
    <form className="admin-formulario admin-formulario-empresa vidro" onSubmit={criar}>
      <div className="cabecalho-formulario-empresa"><h3>Nova empresa e administrador</h3><p>Crie o acesso inicial. O administrador da empresa completará o perfil institucional depois de iniciar sessão.</p></div>
      <label>Nome da empresa<input name="nome" minLength="3" maxLength="160" required /></label>
      <label>Nome do administrador<input name="administradorNome" minLength="3" required /></label>
      <label>Apelido do administrador<input name="administradorApelido" minLength="2" required /></label>
      <label>Telefone do administrador<input name="administradorTelefone" type="tel" placeholder="+258840000000" required /></label>
      <label>Palavra-passe inicial<input name="administradorPalavraPasse" type="password" minLength="8" required /></label>
      <button type="submit">Criar empresa e administrador</button>
    </form>
    {emEdicao && <form className="admin-formulario admin-formulario-empresa vidro" onSubmit={guardar} key={emEdicao.id}>
      <div className="cabecalho-formulario-empresa"><h3>Editar identificação da empresa</h3><p>Os dados institucionais e o logótipo são mantidos pelo administrador da própria empresa.</p></div>
      <label>Nome da empresa<input name="nome" defaultValue={emEdicao.nome || ''} minLength="3" maxLength="160" required /></label>
      <button type="submit">Guardar alterações</button><button type="button" className="botao-voltar" onClick={() => setEmEdicao(null)}>Cancelar edição</button>
    </form>}
    <TabelaGestao titulo="Empresas registadas" colunas={['ID', 'Empresa', 'Administrador responsável', 'Telefone', 'Cadastro', 'Acesso', 'Ações']} linhas={empresas.map((empresa) => {
      const responsavel = empresa.Users?.[0];
      return [empresa.id, empresa.nome, responsavel ? nomePessoa(responsavel) : 'Sem responsável', responsavel?.telefone || empresa.telefone || '—', nomeEstadoEmpresa(empresa.estadoCadastro), empresa.activa ? 'Ativo' : 'Bloqueado', <span className="admin-acoes"><button onClick={() => setEmEdicao(empresa)}>Editar</button>{empresa.estadoCadastro === 'PENDENTE' ? <><button className="admin-activar" onClick={() => executar(() => decidirCadastroEmpresaAdministrativa(empresa.id, 'APROVADA'), 'Empresa aprovada e acesso liberado.')}>Aprovar</button><button className="admin-desactivar" onClick={() => setEmpresaRejeitar(empresa)}>Rejeitar</button></> : empresa.estadoCadastro !== 'REJEITADA' && <BotaoEstado activo={empresa.activa} aoClicar={() => executar(() => definirEstadoEmpresaAdministrativa(empresa.id, !empresa.activa), `Empresa ${empresa.activa ? 'suspensa' : 'reativada'} com sucesso.`)} />}<button className="admin-eliminar" onClick={() => setEmpresaEliminar(empresa)}>Eliminar</button></span>];
    })} />
    {empresaRejeitar && <ModalCampo titulo="Rejeitar cadastro da empresa" texto={`Explique por que o cadastro de ${empresaRejeitar.nome} não foi aprovado.`} etiquetaCampo="Motivo da rejeição" multilinha minLength={5} maxLength={500} textoConfirmar="Rejeitar cadastro" aProcessar={aProcessar} aoConfirmar={rejeitar} aoFechar={() => setEmpresaRejeitar(null)} />}
    {empresaEliminar && <ModalConfirmacao titulo="Eliminar empresa" texto={`Deseja eliminar ${empresaEliminar.nome}? A empresa deixará de aparecer no sistema e perderá o acesso, mas todo o histórico será preservado.`} textoConfirmar="Eliminar empresa" perigo aProcessar={aProcessar} aoConfirmar={eliminar} aoFechar={() => setEmpresaEliminar(null)} />}
  </>;
}

function PaginaDadosEmpresa({ empresa, executar }) {
  const [logo, setLogo] = useState(null);
  const [previsualizacao, setPrevisualizacao] = useState(empresa?.logoUrl ? `${URL_SERVIDOR}${empresa.logoUrl}` : '');
  const [removerLogo, setRemoverLogo] = useState(false);
  const [erroLocal, setErroLocal] = useState('');

  useEffect(() => {
    if (!logo) setPrevisualizacao(empresa?.logoUrl ? `${URL_SERVIDOR}${empresa.logoUrl}` : '');
  }, [empresa?.logoUrl]);

  async function escolherLogo(evento) {
    const ficheiro = evento.target.files?.[0];
    setErroLocal('');
    if (!ficheiro) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(ficheiro.type)) return setErroLocal('Selecione uma imagem PNG, JPEG ou WebP.');
    if (ficheiro.size > 2 * 1024 * 1024) return setErroLocal('O logótipo deve ter no máximo 2 MB.');
    const dados = await lerFicheiroComoDataUrl(ficheiro);
    setLogo({ nome: ficheiro.name, dados });
    setPrevisualizacao(dados);
    setRemoverLogo(false);
  }

  async function guardar(evento) {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    const concluido = await executar(() => actualizarEmpresaAdministrativa({
      nome: valores.nome,
      telefone: valores.telefone,
      descricao: valores.descricao,
      website: valores.website,
      logo,
      removerLogo
    }), 'Dados da empresa atualizados com sucesso.');
    if (concluido) { setLogo(null); setRemoverLogo(false); }
  }

  function removerPrevisualizacao() {
    setLogo(null); setPrevisualizacao(''); setRemoverLogo(true); setErroLocal('');
  }

  return <section className="perfil-empresa-admin vidro">
    <div className="titulo-secao"><div><p className="etiqueta">Identidade da transportadora</p><h3>Dados da empresa</h3><p>Estas informações aparecem para os passageiros durante a escolha da viagem.</p></div></div>
    <form onSubmit={guardar} className="formulario-empresa-admin">
      <div className="editor-logo-empresa">
        <div className="previsualizacao-logo">{previsualizacao ? <img src={previsualizacao} alt="Pré-visualização do logótipo" /> : <Icone nome="autocarro" />}</div>
        <div><strong>Logótipo da empresa</strong><p>PNG, JPEG ou WebP. Tamanho máximo de 2 MB.</p><label className="botao-selecionar-logo">Escolher imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={escolherLogo} /></label>{previsualizacao && <button type="button" className="botao-remover-logo" onClick={removerPrevisualizacao}>Remover logótipo</button>}</div>
      </div>
      <div className="campos-empresa-admin">
        <label>Nome da empresa<input name="nome" defaultValue={empresa?.nome || ''} minLength="3" maxLength="160" required /></label>
        <label>Telefone institucional<input name="telefone" type="tel" defaultValue={empresa?.telefone || ''} placeholder="+258840000000" /></label>
        <label>Website<input name="website" type="url" defaultValue={empresa?.website || ''} placeholder="https://empresa.co.mz" /></label>
        <label className="campo-descricao-empresa">Descrição<textarea name="descricao" defaultValue={empresa?.descricao || ''} maxLength="500" rows="5" placeholder="Apresente brevemente a transportadora e os seus serviços." /></label>
      </div>
      {erroLocal && <p className="mensagem-formulario erro">{erroLocal}</p>}
      <button className="botao-guardar-empresa" type="submit">Guardar alterações</button>
    </form>
  </section>;
}

function lerFicheiroComoDataUrl(ficheiro) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result);
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o logótipo selecionado.'));
    leitor.readAsDataURL(ficheiro);
  });
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
    <TabelaGestao key={JSON.stringify(filtros)} titulo="Registo de auditoria" colunas={['Data', 'Administrador', 'Operação', 'Entidade', 'Identificador', 'Endereço IP', 'Valores']} linhas={auditoriasFiltradas.map((item) => [formatarData(item.criado_em), item.User ? nomePessoa(item.User) : 'Sistema', item.operacao, item.entidade, item.entidadeId || '—', formatarEnderecoIp(item.enderecoIp), JSON.stringify(item.valoresNovos || {})])} />
  </>;
}

function FormularioAutocarro({ aoSubmeter }) { return <form className="admin-formulario admin-formulario-autocarro vidro" onSubmit={aoSubmeter}><h3>Novo autocarro</h3><label>Matrícula<input name="matricula" required /></label><label>Modelo<input name="modelo" required /></label><label>Capacidade<input name="capacidade" type="number" min="1" max="120" required /></label><label>Assentos à esquerda do corredor<select name="lugaresEsquerda" defaultValue="2"><option value="1">1 assento</option><option value="2">2 assentos</option><option value="3">3 assentos</option></select></label><label>Assentos à direita do corredor<select name="lugaresDireita" defaultValue="2"><option value="1">1 assento</option><option value="2">2 assentos</option><option value="3">3 assentos</option></select></label><p className="ajuda-layout-autocarro">Os assentos exteriores de cada fila serão marcados automaticamente como lugares junto à janela.</p><button>Adicionar autocarro e gerar assentos</button></form>; }
function FormularioRota({ aoSubmeter }) { return <form className="admin-formulario admin-formulario-rota vidro" onSubmit={aoSubmeter}><h3>Nova rota</h3><SelecaoLocalidade prefixo="origem" titulo="Origem" /><SelecaoLocalidade prefixo="destino" titulo="Destino" /><label>Distância em km<input name="distanciaKm" type="number" min="1" /></label><button>Adicionar rota</button></form>; }
function FormularioViagem({ rotas, autocarros, aoSubmeter }) {
  const [tipo, setTipo] = useState('UNICA');
  const semanal = tipo === 'SEMANAL';
  const recorrente = tipo !== 'UNICA';
  const dias = [['1', 'Segunda'], ['2', 'Terça'], ['3', 'Quarta'], ['4', 'Quinta'], ['5', 'Sexta'], ['6', 'Sábado'], ['0', 'Domingo']];
  return <form className="admin-formulario admin-formulario-viagem vidro" onSubmit={aoSubmeter}>
    <div className="cabecalho-formulario-empresa"><h3>Nova viagem</h3><p>Crie uma partida única ou gere várias partidas recorrentes.</p></div>
    <label>Rota<select name="rotaId" required><option value="">Selecionar</option>{rotas.map((item) => <option key={item.id} value={item.id}>{item.origin} → {item.destination}</option>)}</select></label>
    <label>Autocarro<select name="autocarroId" required><option value="">Selecionar</option>{autocarros.map((item) => <option key={item.id} value={item.id}>{item.registration} · {item.model}</option>)}</select></label>
    <label>Frequência<select name="tipoAgendamento" value={tipo} onChange={(evento) => setTipo(evento.target.value)}><option value="UNICA">Uma única vez</option><option value="DIARIA">Todos os dias</option><option value="SEMANAL">Dias específicos da semana</option></select></label>
    {!recorrente && <><label>Partida<input name="partidaEm" type="datetime-local" required /></label><label>Chegada prevista<input name="chegadaPrevistaEm" type="datetime-local" required /></label></>}
    {recorrente && <><label>Data inicial<input name="dataInicio" type="date" required /></label><label>Data final<input name="dataFim" type="date" required /></label><label>Hora de partida<input name="horaPartida" type="time" required /></label><label>Duração prevista em minutos<input name="duracaoMinutos" type="number" min="1" max="2880" defaultValue="120" required /></label></>}
    {semanal && <fieldset className="dias-semana-viagem"><legend>Dias de circulação</legend>{dias.map(([valor, nome]) => <label key={valor}><input type="checkbox" name="diasSemana" value={valor} />{nome}</label>)}</fieldset>}
    <label>Preço em MT<input name="preco" type="number" min="1" step="0.01" required /></label>
    {recorrente && <p className="ajuda-layout-autocarro">Serão criadas viagens independentes para cada data futura, até ao limite de 366 dias. Datas passadas são ignoradas.</p>}
    <button>Agendar {recorrente ? 'viagens' : 'viagem'}</button>
  </form>;
}

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
function formatarEnderecoIp(valor) {
  if (!valor) return '—';
  if (valor.startsWith('::ffff:')) return valor.slice(7);
  return valor === '::1' ? '127.0.0.1' : valor;
}
function descreverFrequencia(viagem) {
  if (viagem.recurrenceType === 'DIARIA') return `Diária · ${viagem.recurrenceStart || '—'} a ${viagem.recurrenceEnd || '—'}`;
  if (viagem.recurrenceType === 'SEMANAL') {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias = String(viagem.recurrenceDays || '').split(',').filter(Boolean).map((dia) => nomes[Number(dia)]).join(', ');
    return `Semanal (${dias || 'dias não registados'})`;
  }
  return 'Única';
}
function formatarDataFormulario(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function estadoCupao(cupao) {
  if (!cupao.activo) return 'Desativado';
  const agora = new Date();
  if (agora < new Date(cupao.validoDe)) return 'Agendado';
  if (agora > new Date(cupao.validoAte)) return 'Expirado';
  if (cupao.limiteUtilizacoes && cupao.totalUtilizacoes >= cupao.limiteUtilizacoes) return 'Esgotado';
  return 'Ativo';
}
function nomePerfil(perfil) { return { PASSAGEIRO: 'Cliente', GESTOR_SUPORTE: 'Atendente', EMPRESA_ADMIN: 'Administrador da empresa', ADMIN: 'Administrador da plataforma' }[perfil] || perfil; }
function nomePessoa(pessoa) { return pessoa ? `${pessoa.nome || ''} ${pessoa.apelido || ''}`.trim() : '—'; }
function nomeEstadoWhatsApp(estado) { return { NAO_INICIADO: 'Não iniciado', A_INICIAR: 'A iniciar', PROCESSO_PARADO: 'Processo parado', ERRO_PROCESSO: 'Erro no processo', A_LIGAR: 'A ligar', AGUARDA_QR: 'Aguarda QR Code', LIGADO: 'Ligado', A_RECONECTAR: 'A reconectar', SESSAO_TERMINADA: 'Sessão terminada', ERRO_RECONEXAO: 'Falha na reconexão' }[estado] || estado; }
function nomeEstadoEnvio(estado) { return { PENDENTE: 'Pendente', PROCESSANDO: 'A enviar', ENVIADO: 'Enviado', FALHADO: 'Falhado', EXPIRADO: 'Expirado' }[estado] || estado; }
function nomeEstadoEmpresa(estado) { return { PENDENTE: 'Pendente de aprovação', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', SUSPENSA: 'Suspensa' }[estado] || estado || 'Aprovada'; }
