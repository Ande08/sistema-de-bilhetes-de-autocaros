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
  const { assentos, assentoId, aReservar, seleccionar: seleccionarAssento, actualizar: actualizarAssentos } = useSelecaoAssentosTempoReal(viagem?.id, setErro);

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
    setErro(''); setViagem(item);
  }

  async function vender(evento) {
    evento.preventDefault();
    if (!clienteId || !viagem || !assentoId) return setErro('Selecione o cliente, a viagem e o assento.');
    setErro(''); setResultado(null); setAProcessar(true);
    try {
      const campos = Object.fromEntries(new FormData(evento.currentTarget));
      const dadosPagamento = metodo === 'CARTAO'
        ? { numeroCartao: campos.numeroCartao, validade: campos.validade, cvv: campos.cvv }
        : { telefone: campos.telefone };
      const iniciada = await iniciarPagamentoSimulado({ viagemId: viagem.id, metodo, dadosPagamento });
      const aprovada = await processarPagamentoSimulado(iniciada.referencia);
      const compra = await comprarBilhete({
        utilizadorId: Number(clienteId), viagemId: viagem.id, assentoId: Number(assentoId),
        metodoPagamento: metodo, referenciaPagamento: aprovada.referencia
      });
      setResultado(compra.bilhete);
      await actualizarAssentos();
    } catch (falha) { setErro(falha.message); await actualizarAssentos().catch(() => {}); }
    finally { setAProcessar(false); }
  }

  const cliente = clientes.find((item) => String(item.id) === String(clienteId));
  return <main className="admin-conteudo">
    <header className="admin-topo"><div><p>Venda presencial</p><h1>Nova venda de bilhete</h1></div><div className="indicador-online">Atendimento disponível</div></header>
    {erro && <p className="mensagem-formulario erro" role="alert">{erro}</p>}
    {resultado && <section className="venda-sucesso vidro"><span><Icone nome="confirmado" /></span><div><strong>Bilhete emitido com sucesso</strong><p>{resultado.codigo} · {cliente?.nome} {cliente?.apelido}</p></div></section>}
    <section className="venda-atendente vidro">
      <div className="titulo-secao"><div><h3>Cliente e viagem</h3><p>A venda será registada na conta do cliente seleccionado.</p></div></div>
      <label className="campo-venda">Cliente<select value={clienteId} onChange={(evento) => setClienteId(evento.target.value)} required><option value="">Seleccione um cliente</option>{clientes.map((item) => <option key={item.id} value={item.id}>{item.nome} {item.apelido} · {item.telefone}</option>)}</select></label>
      <form className="pesquisa-venda" onSubmit={pesquisar}>
        <SelecaoLocalidade prefixo="origem" titulo="Origem" />
        <SelecaoLocalidade prefixo="destino" titulo="Destino" />
        <label>Data<input name="data" type="date" min={new Date().toISOString().slice(0, 10)} required /></label>
        <button disabled={aProcessar}>{aProcessar ? 'A processar...' : 'Pesquisar'}</button>
      </form>
      {viagens.length > 0 && <div className="lista-venda-viagens">{viagens.map((item) => <button key={item.id} className={String(viagem?.id) === String(item.id) ? 'seleccionada' : ''} onClick={() => escolherViagem(item)}><span><strong>{item.Route?.origin} → {item.Route?.destination}</strong><small>{item.Empresa?.nome} · {formatarData(item.departureAt)}</small></span><b>{formatarValor(item.price)}</b></button>)}</div>}
      {viagem && <form className="formulario-venda-final" onSubmit={vender}>
        <div><h3>Escolha do assento</h3><MapaAssentos assentos={assentos} assentoId={assentoId} aoSelecionar={seleccionarAssento} apenasSimples />{aReservar && <p className="estado-reserva-assento">A reservar o assento...</p>}</div>
        <div className="pagamento-atendente"><h3>Pagamento simulado</h3><label>Método<select value={metodo} onChange={(evento) => setMetodo(evento.target.value)}><option value="MPESA">M-Pesa</option><option value="EMOLA">e-Mola</option><option value="CARTAO">Cartão</option></select></label>{metodo === 'CARTAO' ? <><label>Número do cartão<input name="numeroCartao" defaultValue="4242 4242 4242 4242" required /></label><label>Validade<input name="validade" defaultValue="12/30" required /></label><label>CVV<input name="cvv" type="password" defaultValue="123" required /></label></> : <label>Telefone do pagamento<input name="telefone" type="tel" defaultValue={cliente?.telefone || ''} key={cliente?.telefone} required /></label>}<button disabled={aProcessar || aReservar || !assentoId}>{aProcessar ? 'A emitir bilhete...' : `Concluir venda · ${formatarValor(viagem.price)}`}</button></div>
      </form>}
    </section>
  </main>;
}

function formatarData(valor) { return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)); }
