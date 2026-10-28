import { Component, lazy, Suspense, useMemo, useState } from 'react';

const MapaAssentos3D = lazy(() => import('./MapaAssentos3D.jsx'));

// Evita carregar o módulo Three.js quando a ligação ou o aparelho indicam que
// a experiência 2D será mais rápida e estável.
export function avaliarCapacidade3D(navegador = globalThis.navigator, documento = globalThis.document) {
  try {
    const ligacao = navegador?.connection || navegador?.mozConnection || navegador?.webkitConnection;
    if (ligacao?.saveData || ['slow-2g', '2g', '3g'].includes(ligacao?.effectiveType) || (ligacao?.downlink && ligacao.downlink < 1.5)) {
      return { permitido: false, motivo: 'Ligação lenta ou modo de poupança de dados detectado.' };
    }
    if ((navegador?.deviceMemory && navegador.deviceMemory < 4) || (navegador?.hardwareConcurrency && navegador.hardwareConcurrency < 4)) {
      return { permitido: false, motivo: 'Mapa simples ativado para melhorar o desempenho neste dispositivo.' };
    }
    const canvas = documento?.createElement?.('canvas');
    const webgl = canvas?.getContext?.('webgl2') || canvas?.getContext?.('webgl');
    if (!webgl) return { permitido: false, motivo: 'Este dispositivo não suporta a visualização 3D.' };
    return { permitido: true, motivo: '' };
  } catch {
    return { permitido: false, motivo: 'Não foi possível iniciar a visualização 3D.' };
  }
}

class LimiteErro3D extends Component {
  constructor(props) { super(props); this.state = { falhou: false }; }
  static getDerivedStateFromError() { return { falhou: true }; }
  componentDidCatch() { this.props.aoFalhar?.(); }
  render() { return this.state.falhou ? this.props.alternativa : this.props.children; }
}

export default function MapaAssentos({ assentos, assentoId, aoSelecionar, apenasSimples = false }) {
  const capacidade = useMemo(() => avaliarCapacidade3D(), []);
  const [modo, setModo] = useState(!apenasSimples && capacidade.permitido ? '3d' : 'simples');
  const [falha3D, setFalha3D] = useState(false);
  const usar3D = modo === '3d' && !falha3D;

  const mapaSimples = <MapaSimples assentos={assentos} assentoId={assentoId} aoSelecionar={aoSelecionar} />;

  return <section className="selector-assentos-completo">
    {!apenasSimples && <div className="selector-assentos-topo">
      <div><strong>{usar3D ? 'Vista tridimensional' : 'Mapa simples'}</strong><small>{usar3D ? 'Arraste para rodar e clique no assento.' : capacidade.motivo || 'Vista leve e acessível.'}</small></div>
      <div className="alternador-mapa" role="group" aria-label="Modo do mapa de assentos">
        <button type="button" className={!usar3D ? 'activo' : ''} onClick={() => setModo('simples')}>Mapa simples</button>
        <button type="button" className={usar3D ? 'activo' : ''} disabled={!capacidade.permitido || falha3D} onClick={() => setModo('3d')}>Vista 3D</button>
      </div>
    </div>}

    {usar3D ? <LimiteErro3D alternativa={mapaSimples} aoFalhar={() => setFalha3D(true)}>
      <Suspense fallback={<div className="mapa-3d-carregando">A preparar o interior do autocarro...</div>}>
        <MapaAssentos3D assentos={assentos} assentoId={assentoId} aoSelecionar={aoSelecionar} />
      </Suspense>
    </LimiteErro3D> : mapaSimples}
  </section>;
}

function MapaSimples({ assentos, assentoId, aoSelecionar }) {
  const filas = useMemo(() => agruparPorFila(assentos), [assentos]);
  return <div className="autocarro-2d" aria-label="Mapa simples dos assentos do autocarro">
    <div className="frente-autocarro"><span>Frente do autocarro</span><i aria-hidden="true" /></div>
    <div className="cabecalho-janelas"><span>Janelas</span><span>Janelas</span></div>
    <div className="filas-autocarro">
      {filas.map(({ fila, esquerda, direita }) => <div className="fila-autocarro" key={fila}>
        <i className="janela-mapa" title="Janela" aria-hidden="true" />
        <div className="bloco-assentos lado-esquerdo">{esquerda.map((assento) => <BotaoAssento key={assento.id} assento={assento} assentoId={assentoId} aoSelecionar={aoSelecionar} />)}</div>
        <span className="corredor-mapa"><small>{fila}</small></span>
        <div className="bloco-assentos lado-direito">{direita.map((assento) => <BotaoAssento key={assento.id} assento={assento} assentoId={assentoId} aoSelecionar={aoSelecionar} />)}</div>
        <i className="janela-mapa" title="Janela" aria-hidden="true" />
      </div>)}
    </div>
    <div className="legenda-posicao"><span><i className="icone-janela" /> Junto à janela</span><span><i className="icone-corredor" /> Corredor</span></div>
  </div>;
}

function BotaoAssento({ assento, assentoId, aoSelecionar }) {
  const seleccionado = String(assentoId) === String(assento.id);
  const posicao = assento.juntoJanela ? 'junto à janela' : 'junto ao corredor';
  return <button
    type="button"
    disabled={!assento.disponivel}
    className={`assento-mapa ${seleccionado ? 'seleccionado' : ''} ${assento.reservadoTemporariamente ? 'reserva-temporaria' : ''} ${assento.juntoJanela ? 'junto-janela' : 'junto-corredor'}`}
    onClick={() => aoSelecionar(assento.id)}
    aria-pressed={seleccionado}
    aria-label={`Assento ${assento.numero}, ${posicao}, ${assento.reservadoTemporariamente ? 'temporariamente reservado' : assento.disponivel ? 'disponível' : 'ocupado'}`}
    title={`Assento ${assento.numero} · ${posicao}${assento.reservadoTemporariamente ? ' · reservado por outro usuário' : ''}`}
  >
    <span>{assento.numero}</span>
    {assento.juntoJanela && <small>Janela</small>}
  </button>;
}

function agruparPorFila(assentos) {
  const grupos = new Map();
  assentos.forEach((assento, indice) => {
    const fila = Number(assento.fila) || Math.floor(indice / 4) + 1;
    const normalizado = {
      ...assento,
      fila,
      lado: assento.lado || (indice % 4 < 2 ? 'ESQUERDO' : 'DIREITO'),
      juntoJanela: assento.juntoJanela ?? [0, 3].includes(indice % 4)
    };
    if (!grupos.has(fila)) grupos.set(fila, { fila, esquerda: [], direita: [] });
    grupos.get(fila)[normalizado.lado === 'DIREITO' ? 'direita' : 'esquerda'].push(normalizado);
  });
  return [...grupos.values()].sort((a, b) => a.fila - b.fila);
}
