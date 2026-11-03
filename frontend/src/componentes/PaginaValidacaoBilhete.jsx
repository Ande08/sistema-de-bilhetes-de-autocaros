import { useEffect, useState } from 'react';
import Icone from './Icone.jsx';
import { URL_SERVIDOR, validarBilhetePublico } from '../servicos/api.js';

export default function PaginaValidacaoBilhete({ codigo }) {
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setErro(''); setResultado(null);
    validarBilhetePublico(codigo).then(setResultado).catch((falha) => setErro(falha.message));
  }, [codigo]);

  return <main className="pagina-validacao-bilhete">
    <section className="cartao-validacao-bilhete vidro">
      <header className="marca-validacao"><span className="logotipo-icone"><Icone nome="autocarro" /></span><div><strong>Viagem Bus</strong><small>Verificação oficial de bilhete</small></div></header>
      {!resultado && !erro && <div className="validacao-carregando"><span className="marca-carregamento"><Icone nome="bilhete" /></span><h1>A verificar o bilhete</h1><p>Estamos a consultar o registo oficial.</p></div>}
      {erro && <div className="resultado-validacao resultado-invalido"><span><Icone nome="alerta" /></span><h1>Bilhete não confirmado</h1><p>{erro}</p><strong>{codigo}</strong></div>}
      {resultado && <>
        <div className={`resultado-validacao ${resultado.validoParaEmbarque ? 'resultado-valido' : 'resultado-atencao'}`}>
          <span><Icone nome={resultado.validoParaEmbarque ? 'confirmado' : 'alerta'} /></span>
          <p className="etiqueta">Autenticidade confirmada</p>
          <h1>{resultado.validoParaEmbarque ? 'Bilhete válido' : 'Bilhete autêntico'}</h1>
          <p>{resultado.situacao.mensagem}</p>
        </div>
        <div className="empresa-validacao">{resultado.empresa.logoUrl ? <img src={`${URL_SERVIDOR}${resultado.empresa.logoUrl}`} alt={`Logótipo da ${resultado.empresa.nome}`} /> : <span className="logo-empresa-generico"><Icone nome="autocarro" /></span>}<div><small>Empresa responsável</small><strong>{resultado.empresa.nome}</strong></div></div>
        <dl className="detalhes-validacao-bilhete">
          <div><dt>Código</dt><dd>{resultado.bilhete.codigo}</dd></div>
          <div><dt>Rota</dt><dd>{resultado.viagem.origem} → {resultado.viagem.destino}</dd></div>
          <div><dt>Partida</dt><dd>{formatarDataHora(resultado.viagem.partidaEm)}</dd></div>
          <div><dt>Assento</dt><dd>{resultado.assento.numero}{resultado.assento.juntoJanela ? ' · Janela' : ''}</dd></div>
          <div><dt>Estado do bilhete</dt><dd>{traduzirEstado(resultado.bilhete.estado)}</dd></div>
          <div><dt>Estado da viagem</dt><dd>{traduzirEstado(resultado.viagem.estado)}</dd></div>
        </dl>
        <p className="nota-validacao">A consulta confirma o registo diretamente no Sistema de Bilhetes. Nenhum dado pessoal ou financeiro é exibido.</p>
      </>}
      <a className="botao-pagina-validacao" href="/">Ir para a página inicial</a>
    </section>
  </main>;
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Maputo' }).format(data);
}

function traduzirEstado(estado) {
  return { EMITIDO: 'Emitido', UTILIZADO: 'Utilizado', CANCELADO: 'Cancelado', RESERVADO: 'Reservado', AGENDADA: 'Agendada', EM_CURSO: 'Em curso', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }[estado] || estado || '-';
}
