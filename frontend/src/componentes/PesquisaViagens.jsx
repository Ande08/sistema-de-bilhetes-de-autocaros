import { useState } from 'react';

export default function PesquisaViagens({ aoPesquisar }) {
  const [filtros, setFiltros] = useState({ origem: '', destino: '', date: '' });

  function alterarCampo(evento) {
    setFiltros({ ...filtros, [evento.target.name]: evento.target.value });
  }

  function submeter(evento) {
    evento.preventDefault();
    aoPesquisar(filtros);
  }

  return (
    <form className="cartao formulario-pesquisa" onSubmit={submeter}>
      <label>Origem<input name="origem" value={filtros.origem} onChange={alterarCampo} placeholder="Ex.: Tete" /></label>
      <label>Destino<input name="destino" value={filtros.destino} onChange={alterarCampo} placeholder="Ex.: Maputo" /></label>
      <label>Data<input type="date" name="date" value={filtros.date} onChange={alterarCampo} /></label>
      <button type="submit">Pesquisar viagens</button>
    </form>
  );
}
