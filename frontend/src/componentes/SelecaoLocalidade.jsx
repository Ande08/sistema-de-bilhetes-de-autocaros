import { useEffect, useId, useMemo, useState } from 'react';
import { listarLocalidades } from '../servicos/api.js';

let catalogoEmMemoria = null;
let pedidoCatalogo = null;

function carregarCatalogo() {
  if (catalogoEmMemoria) return Promise.resolve(catalogoEmMemoria);
  if (!pedidoCatalogo) pedidoCatalogo = listarLocalidades().then((dados) => (catalogoEmMemoria = dados));
  return pedidoCatalogo;
}

export function construirOpcoesLocalidade(localidades) {
  return localidades.flatMap((item) => item.cidades.map((cidade) => ({
    provincia: item.provincia,
    cidade,
    texto: `${cidade} — ${item.provincia}`
  })));
}

export function localizarOpcaoLocalidade(opcoes, texto) {
  const normalizado = String(texto || '').trim().toLocaleLowerCase('pt-MZ');
  return opcoes.find((item) => item.texto.toLocaleLowerCase('pt-MZ') === normalizado) || null;
}

export default function SelecaoLocalidade({ prefixo, titulo, valorInicialProvincia = '', valorInicialCidade = '', compacto = false, pesquisavel = false }) {
  const [localidades, setLocalidades] = useState([]);
  const [provincia, setProvincia] = useState(valorInicialProvincia);
  const [cidade, setCidade] = useState(valorInicialCidade);
  const [textoPesquisa, setTextoPesquisa] = useState(valorInicialProvincia && valorInicialCidade ? `${valorInicialCidade} — ${valorInicialProvincia}` : '');
  const listaId = useId().replace(/:/g, '');

  useEffect(() => { carregarCatalogo().then(setLocalidades); }, []);
  useEffect(() => {
    setProvincia(valorInicialProvincia);
    setCidade(valorInicialCidade);
    setTextoPesquisa(valorInicialProvincia && valorInicialCidade ? `${valorInicialCidade} — ${valorInicialProvincia}` : '');
  }, [valorInicialProvincia, valorInicialCidade]);
  const cidades = localidades.find((item) => item.provincia === provincia)?.cidades || [];
  const opcoes = useMemo(() => construirOpcoesLocalidade(localidades), [localidades]);

  // Nas pesquisas do cliente, o campo aceita texto e o navegador filtra as
  // opções pelo nome da cidade ou da província. Os valores reais continuam em
  // campos ocultos e só são preenchidos quando a opção pertence ao catálogo.
  if (compacto || pesquisavel) {
    return <label className="selecao-localidade-pesquisavel">{titulo}
      <input
        type="search"
        list={listaId}
        value={textoPesquisa}
        placeholder="Pesquisar cidade ou província"
        autoComplete="off"
        required
        onChange={(evento) => {
          const texto = evento.target.value;
          const opcao = localizarOpcaoLocalidade(opcoes, texto);
          setTextoPesquisa(texto);
          setProvincia(opcao?.provincia || '');
          setCidade(opcao?.cidade || '');
          evento.target.setCustomValidity(texto && !opcao ? 'Selecione uma cidade apresentada na lista.' : '');
        }}
        onInvalid={(evento) => {
          if (textoPesquisa && !cidade) evento.currentTarget.setCustomValidity('Selecione uma cidade apresentada na lista.');
        }}
      />
      <datalist id={listaId}>{opcoes.map((item) => <option key={`${item.provincia}-${item.cidade}`} value={item.texto} />)}</datalist>
      <input type="hidden" name={`${prefixo}Provincia`} value={provincia} />
      <input type="hidden" name={prefixo} value={cidade} />
    </label>;
  }

  return <>
    <label>{titulo}: província<select name={`${prefixo}Provincia`} value={provincia} onChange={(evento) => { setProvincia(evento.target.value); setCidade(''); }} required><option value="">Selecionar província</option>{localidades.map((item) => <option key={item.provincia} value={item.provincia}>{item.provincia}</option>)}</select></label>
    <label>{titulo}: cidade<select name={prefixo} value={cidade} onChange={(evento) => setCidade(evento.target.value)} disabled={!provincia} required><option value="">Selecionar cidade</option>{cidades.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
  </>;
}
