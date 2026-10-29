import { useEffect, useState } from 'react';
import { listarLocalidades } from '../servicos/api.js';

let catalogoEmMemoria = null;
let pedidoCatalogo = null;

function carregarCatalogo() {
  if (catalogoEmMemoria) return Promise.resolve(catalogoEmMemoria);
  if (!pedidoCatalogo) pedidoCatalogo = listarLocalidades().then((dados) => (catalogoEmMemoria = dados));
  return pedidoCatalogo;
}

export default function SelecaoLocalidade({ prefixo, titulo, valorInicialProvincia = '', valorInicialCidade = '' }) {
  const [localidades, setLocalidades] = useState([]);
  const [provincia, setProvincia] = useState(valorInicialProvincia);
  const [cidade, setCidade] = useState(valorInicialCidade);

  useEffect(() => { carregarCatalogo().then(setLocalidades); }, []);
  useEffect(() => { setProvincia(valorInicialProvincia); setCidade(valorInicialCidade); }, [valorInicialProvincia, valorInicialCidade]);
  const cidades = localidades.find((item) => item.provincia === provincia)?.cidades || [];

  return <>
    <label>{titulo}: província<select name={`${prefixo}Provincia`} value={provincia} onChange={(evento) => { setProvincia(evento.target.value); setCidade(''); }} required><option value="">Selecionar província</option>{localidades.map((item) => <option key={item.provincia} value={item.provincia}>{item.provincia}</option>)}</select></label>
    <label>{titulo}: cidade<select name={prefixo} value={cidade} onChange={(evento) => setCidade(evento.target.value)} disabled={!provincia} required><option value="">Selecionar cidade</option>{cidades.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
  </>;
}
