import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import MapaAssentos from './MapaAssentos.jsx';
import SelecaoLocalidade from './SelecaoLocalidade.jsx';
import {
  comprarBilhete,
  iniciarPagamentoSimulado,
  listarClientesAtendimento,
  pesquisarViagens,
  processarPagamentoSimulado
} from '../servicos/api.js';
import { formatarValor } from '../utilitarios/moeda.js';
import { obterDataHojeMaputo } from '../utilitarios/viagens-inicio.js';
import useSelecaoAssentosTempoReal from '../hooks/useSelecaoAssentosTempoReal.js';

export default function VendaAtendente() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [viagens, setViagens] = useState([]);
  const [viagem, setViagem] = useState(null);
  const [metodo, setMetodo] = useState('MPESA');
  const [aProcessar, setAProcessar] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [atribuicaoAutomatica, setAtribuicaoAutomatica] = useState(false);
  const { assentos, assentoIds, aReservar, seleccionar: alternarReservaAssento, libertar: libertarAssentos, actualizar: actualizarAssentos } = useSelecaoAssentosTempoReal(viagem?.id, setErro);

  useEffect(() => {
    listarClientesAtendimento().then(setClientes).catch((falha) => setErro(falha.message));
  }, []);

  async function pesquisar(evento) {
    evento.preventDefault();
    setErro(''); setResultado(null); setViagem(null);
    setAProcessar(true);
    try { setViagens(await pesquisarViagens(Object.fromEntries(new FormData(evento.currentTarget)))); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function escolherViagem(item) {
    setErro(''); setViagem(item); setQuantidade(1); setAtribuicaoAutomatica(false);
  }

  async function seleccionarAssento(id) {
    const seleccionado = assentoIds.some((actual) => String(actual) === String(id));
    if (!seleccionado && assentoIds.length >= quantidade) return setErro(`Pode selecionar ${quantidade} assento(s).`);
    return alternarReservaAssento(id);
  }

  async function vender(evento) {
    evento.preventDefault();
    if (!clienteId || !viagem || (!atribuicaoAutomatica && assentoIds.length !== quantidade)) return setErro(`Selecione o cliente, a viagem e ${quantidade} assento(s), ou use a atribuição automática.`);
    setErro(''); setResultado(null); setAProcessar(true);
    try {
      const campos = Object.fromEntries(new FormData(evento.currentTarget));
      const dadosPagamento = metodo === 'CARTAO'
        ? { numeroCartao: campos.numeroCartao, validade: campos.validade, cvv: campos.cvv }
        : { telefone: campos.telefone };
      const codigoCupao = String(campos.codigoCupao || '').trim().toUpperCase();
      const iniciada = await iniciarPagamentoSimulado({
        viagemId: viagem.id, utilizadorId: Number(clienteId), quantidade, metodo, dadosPagamento,
        codigoCupao: codigoCupao || null
      });
      const aprovada = await processarPagamentoSimulado(iniciada.referencia);
      const compra = await comprarBilhete({
        utilizadorId: Number(clienteId), viagemId: viagem.id, assentoIds, quantidade, atribuicaoAutomatica,
        metodoPagamento: metodo, referenciaPagamento: aprovada.referencia,
        codigoCupao: codigoCupao || null
      });
      setResultado(compra);
      await actualizarAssentos();
    } catch (falha) { setErro(falha.message); await actualizarAssentos().catch(() => {}); }
    finally { setAProcessar(false); }
  }

  const cliente = clientes.find((item) => String(item.id) === String(clienteId));
  return <main className="admin-conteudo">
    <header className="admin-topo"><div><p>Venda presencial</p><h1>Nova venda de bilhete</h1></div><div className="indicador-online">Atendimento disponível</div></header>
    {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
    {resultado && <section className="venda-sucesso vidro"><span><Icone nome="confirmado" /></span><div><strong>{resultado.quantidade} bilhete(s) emitido(s) com sucesso</strong><p>{resultado.bilhetes.map((item) => item.codigo).join(', ')} · {cliente?.nome} {cliente?.apelido}</p></div></section>}
    <section className="venda-atendente vidro">
      <div className="titulo-secao"><div><h3>Cliente e viagem</h3><p>A venda será registada na conta do cliente seleccionado.</p></div></div>
      <label className="campo-venda">Cliente<select value={clienteId} onChange={(evento) => setClienteId(evento.target.value)} required><option value="">Seleccione um cliente</option>{clientes.map((item) => <option key={item.id} value={item.id}>{item.nome} {item.apelido} · {item.telefone}</option>)}</select></label>
      <form className="pesquisa-venda" onSubmit={pesquisar}>
        <SelecaoLocalidade prefixo="origem" titulo="Origem" />
        <SelecaoLocalidade prefixo="destino" titulo="Destino" />
        <label>Data <small>Opcional; sem data mostra hoje e os próximos dias.</small><input name="data" type="date" min={obterDataHojeMaputo()} /></label>
        <button disabled={aProcessar}>{aProcessar ? 'A processar...' : 'Pesquisar'}</button>
      </form>
      {viagens.length > 0 && <div className="lista-venda-viagens">{viagens.map((item) => <button key={item.id} className={String(viagem?.id) === String(item.id) ? 'seleccionada' : ''} onClick={() => escolherViagem(item)}><span><strong>{item.Route?.origin} → {item.Route?.destination}</strong><small>{item.Empresa?.nome} · {formatarData(item.departureAt)}</small></span><b>{formatarValor(item.price)}</b></button>)}</div>}
      {viagem && <form className="formulario-venda-final" onSubmit={vender}>
        <div><h3>Escolha dos assentos</h3><div className="configuracao-multiplos-bilhetes"><label>Quantidade<select value={quantidade} onChange={async (evento) => { setQuantidade(Number(evento.target.value)); await libertarAssentos(); }}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></label><label className="opcao-atribuicao-automatica"><input type="checkbox" checked={atribuicaoAutomatica} onChange={async (evento) => { setAtribuicaoAutomatica(evento.target.checked); if (evento.target.checked) await libertarAssentos(); }} /><span>Atribuir automaticamente</span></label></div>{!atribuicaoAutomatica && <MapaAssentos assentos={assentos} assentoIds={assentoIds} aoSelecionar={seleccionarAssento} />}{atribuicaoAutomatica && <p className="aviso-prioridade-automatica">O sistema escolherá {quantidade} assento(s) livre(s).</p>}{aReservar && <p className="estado-reserva-assento">A reservar o assento...</p>}</div>
        <div className="pagamento-atendente"><h3>Pagamento simulado</h3><label>Cupão opcional<input name="codigoCupao" maxLength="30" placeholder="Código do cupão" /></label><label>Método<select value={metodo} onChange={(evento) => setMetodo(evento.target.value)}><option value="MPESA">M-Pesa</option><option value="EMOLA">e-Mola</option><option value="CARTAO">Cartão</option></select></label>{metodo === 'CARTAO' ? <><label>Número do cartão<input name="numeroCartao" defaultValue="4242 4242 4242 4242" required /></label><label>Validade<input name="validade" defaultValue="12/30" required /></label><label>CVV<input name="cvv" type="password" defaultValue="123" required /></label></> : <label>Telefone do pagamento<input name="telefone" type="tel" defaultValue={cliente?.telefone || ''} key={cliente?.telefone} required /></label>}<button disabled={aProcessar || aReservar || (!atribuicaoAutomatica && assentoIds.length !== quantidade)}>{aProcessar ? 'A emitir bilhetes...' : `Concluir venda · ${formatarValor(Number(viagem.price) * quantidade)}`}</button></div>
      </form>}
    </section>
  </main>;
}

function formatarData(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)); }
