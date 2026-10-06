import { useState } from 'react';

export function ModalConfirmacao({ titulo, texto, textoConfirmar = 'Confirmar', perigo = false, aProcessar = false, aoConfirmar, aoFechar }) {
  return <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && !aProcessar && aoFechar()}>
    <section className="modal-projecto vidro" role="alertdialog" aria-modal="true" aria-labelledby="titulo-modal-confirmacao">
      <div className="modal-topo"><div><p className="etiqueta">Confirmação</p><h2 id="titulo-modal-confirmacao">{titulo}</h2></div><button type="button" className="fechar-modal" disabled={aProcessar} onClick={aoFechar} aria-label="Fechar">×</button></div>
      <p className="texto-modal-projecto">{texto}</p>
      <div className="acoes-modal-projecto"><button type="button" className="botao-voltar" disabled={aProcessar} onClick={aoFechar}>Voltar</button><button type="button" className={perigo ? 'botao-modal-perigo' : 'botao-pesquisar'} disabled={aProcessar} onClick={aoConfirmar}>{aProcessar ? 'A processar...' : textoConfirmar}</button></div>
    </section>
  </div>;
}

export function ModalCampo({ titulo, texto, etiquetaCampo, tipo = 'text', valorInicial = '', textoConfirmar = 'Guardar', min, max, step, minLength, aProcessar = false, aoConfirmar, aoFechar }) {
  const [valor, setValor] = useState(valorInicial);

  function submeter(evento) {
    evento.preventDefault();
    aoConfirmar(valor);
  }

  return <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && !aProcessar && aoFechar()}>
    <form className="modal-projecto vidro" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-campo" onSubmit={submeter}>
      <div className="modal-topo"><div><p className="etiqueta">Atualização</p><h2 id="titulo-modal-campo">{titulo}</h2></div><button type="button" className="fechar-modal" disabled={aProcessar} onClick={aoFechar} aria-label="Fechar">×</button></div>
      {texto && <p className="texto-modal-projecto">{texto}</p>}
      <label className="campo-modal-projecto">{etiquetaCampo}<input autoFocus required type={tipo} value={valor} min={min} max={max} step={step} minLength={minLength} onChange={(evento) => setValor(evento.target.value)} /></label>
      <div className="acoes-modal-projecto"><button type="button" className="botao-voltar" disabled={aProcessar} onClick={aoFechar}>Cancelar</button><button type="submit" className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A guardar...' : textoConfirmar}</button></div>
    </form>
  </div>;
}
