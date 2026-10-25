import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function MapaAssentos3D({ assentos, assentoId, aoSelecionar }) {
  const contentorRef = useRef(null);
  const canvasRef = useRef(null);
  const objectosRef = useRef(new Map());
  const seleccionadoRef = useRef(assentoId);
  const seleccionarRef = useRef(aoSelecionar);

  seleccionadoRef.current = assentoId;
  seleccionarRef.current = aoSelecionar;

  useEffect(() => {
    const contentor = contentorRef.current;
    const canvas = canvasRef.current;
    if (!contentor || !canvas) return undefined;

    const cena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(38, 1, .1, 100);
    camara.position.set(10, 13, 15);
    const renderizador = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderizador.shadowMap.enabled = true;
    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;

    const controlos = new OrbitControls(camara, canvas);
    controlos.enableDamping = true;
    controlos.enablePan = false;
    controlos.minDistance = 10;
    controlos.maxDistance = 25;
    controlos.maxPolarAngle = Math.PI * .48;

    cena.add(new THREE.HemisphereLight(0xeaf9ff, 0x3d7199, 2.7));
    const luz = new THREE.DirectionalLight(0xffffff, 3.2);
    luz.position.set(7, 12, 8);
    luz.castShadow = true;
    cena.add(luz);

    const filas = [...new Set(assentos.map((item, indice) => Number(item.fila) || Math.floor(indice / 4) + 1))];
    const comprimento = Math.max(8, filas.length * 1.35 + 3.2);
    const centroZ = (comprimento - 3.2) / 2;
    controlos.target.set(0, .7, centroZ * .18);

    adicionarCaixa(cena, [7.2, .28, comprimento], [0, 0, 0], 0xe9f8ff, true);
    adicionarCaixa(cena, [1.1, .08, comprimento - 1], [0, .2, 0], 0xaed7ef);
    adicionarCaixa(cena, [7.25, .9, .25], [0, .62, -comprimento / 2], 0x0875d7);

    // Cada fila recebe duas janelas transparentes, visíveis junto dos lugares
    // exteriores para tornar inequívoca a posição escolhida.
    filas.forEach((fila, indice) => {
      const z = -comprimento / 2 + 2 + indice * 1.35;
      [-3.58, 3.58].forEach((x) => {
        const janela = new THREE.Mesh(
          new THREE.BoxGeometry(.12, 1.35, 1.05),
          new THREE.MeshPhysicalMaterial({ color: 0x55c2ff, transparent: true, opacity: .28, transmission: .45, roughness: .08, side: THREE.DoubleSide })
        );
        janela.position.set(x, 1.45, z);
        cena.add(janela);
      });
    });

    const porFila = new Map();
    assentos.forEach((assento, indice) => {
      const normalizado = normalizarAssento(assento, indice);
      if (!porFila.has(normalizado.fila)) porFila.set(normalizado.fila, { ESQUERDO: [], DIREITO: [] });
      porFila.get(normalizado.fila)[normalizado.lado].push(normalizado);
    });

    [...porFila.entries()].sort(([a], [b]) => a - b).forEach(([fila, lados], indiceFila) => {
      const z = -comprimento / 2 + 2 + indiceFila * 1.35;
      ['ESQUERDO', 'DIREITO'].forEach((lado) => {
        lados[lado].sort((a, b) => String(a.coluna).localeCompare(String(b.coluna), 'pt', { numeric: true }));
        const total = lados[lado].length;
        lados[lado].forEach((assento, indice) => {
          const passo = 1.3 / Math.max(total - 1, 1);
          // No bloco esquerdo, a primeira coluna é a janela; no direito, a
          // primeira coluna começa junto ao corredor.
          const ordemFisica = lado === 'ESQUERDO' ? total - 1 - indice : indice;
          const afastamento = total === 1 ? 2.25 : 1.25 + ordemFisica * passo;
          const x = lado === 'ESQUERDO' ? -afastamento : afastamento;
          const grupo = criarAssento3D(assento, x, z);
          cena.add(grupo);
          objectosRef.current.set(String(assento.id), grupo);
        });
      });
      void fila;
    });

    function actualizarAspectos(foco = null) {
      objectosRef.current.forEach((grupo, id) => {
        const seleccionado = String(seleccionadoRef.current) === id;
        const ocupado = !grupo.userData.assento.disponivel;
        const cor = ocupado ? 0x879bab : seleccionado ? 0x0875d7 : foco === grupo ? 0x8bd6ff : 0xeaf8ff;
        grupo.children.filter((item) => item.isMesh).forEach((item) => {
          item.material.color.setHex(cor);
          if (item.material.emissive) {
            item.material.emissive.setHex(seleccionado ? 0x07549a : 0x06243c);
            item.material.emissiveIntensity = seleccionado || foco === grupo ? .35 : .06;
          }
        });
        grupo.position.y = seleccionado || foco === grupo ? .08 : 0;
      });
    }
    actualizarAspectos();

    const raio = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    let foco = null;
    let inicioPonteiro = null;
    const alvos = [...objectosRef.current.values()].flatMap((grupo) => grupo.children.filter((item) => item.isMesh));
    function localizar(evento) {
      const area = canvas.getBoundingClientRect();
      ponteiro.set(((evento.clientX - area.left) / area.width) * 2 - 1, -((evento.clientY - area.top) / area.height) * 2 + 1);
      raio.setFromCamera(ponteiro, camara);
      return raio.intersectObjects(alvos, false)[0]?.object?.userData?.grupoAssento || null;
    }
    function mover(evento) {
      const encontrado = localizar(evento);
      if (encontrado !== foco) { foco = encontrado; actualizarAspectos(foco); }
      canvas.style.cursor = foco ? (foco.userData.assento.disponivel ? 'pointer' : 'not-allowed') : 'grab';
    }
    function iniciar(evento) { inicioPonteiro = [evento.clientX, evento.clientY]; }
    function clicar(evento) {
      if (!inicioPonteiro || Math.hypot(evento.clientX - inicioPonteiro[0], evento.clientY - inicioPonteiro[1]) > 6) return;
      const encontrado = localizar(evento);
      if (encontrado?.userData.assento.disponivel) seleccionarRef.current(encontrado.userData.assento.id);
    }
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerdown', iniciar);
    canvas.addEventListener('pointerup', clicar);

    const redimensionar = () => {
      const { width, height } = contentor.getBoundingClientRect();
      renderizador.setSize(width, height, false);
      camara.aspect = width / height;
      camara.updateProjectionMatrix();
    };
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redimensionar) : null;
    if (observador) observador.observe(contentor);
    else window.addEventListener('resize', redimensionar);
    redimensionar();

    let animacao;
    const desenhar = () => { controlos.update(); renderizador.render(cena, camara); animacao = requestAnimationFrame(desenhar); };
    desenhar();

    return () => {
      cancelAnimationFrame(animacao);
      observador?.disconnect();
      if (!observador) window.removeEventListener('resize', redimensionar);
      canvas.removeEventListener('pointermove', mover);
      canvas.removeEventListener('pointerdown', iniciar);
      canvas.removeEventListener('pointerup', clicar);
      controlos.dispose();
      cena.traverse((objecto) => {
        objecto.geometry?.dispose?.();
        if (Array.isArray(objecto.material)) objecto.material.forEach((material) => material.dispose());
        else objecto.material?.dispose?.();
      });
      renderizador.dispose();
      objectosRef.current.clear();
    };
  }, [assentos]);

  useEffect(() => {
    objectosRef.current.forEach((grupo, id) => {
      const ocupado = !grupo.userData.assento.disponivel;
      const seleccionado = String(assentoId) === id;
      const cor = ocupado ? 0x879bab : seleccionado ? 0x0875d7 : 0xeaf8ff;
      grupo.children.filter((item) => item.isMesh).forEach((item) => item.material.color.setHex(cor));
      grupo.position.y = seleccionado ? .08 : 0;
    });
  }, [assentoId]);

  return <div className="mapa-assentos-3d" ref={contentorRef}>
    <canvas ref={canvasRef} aria-label="Interior tridimensional do autocarro com janelas e assentos selecionáveis" />
    <div className="indicacao-frente-3d">Frente</div>
    <div className="legenda-janelas-3d"><span>Janelas do lado esquerdo</span><span>Janelas do lado direito</span></div>
  </div>;
}

function normalizarAssento(assento, indice) {
  return {
    ...assento,
    fila: Number(assento.fila) || Math.floor(indice / 4) + 1,
    coluna: assento.coluna || String.fromCharCode(65 + indice % 4),
    lado: assento.lado || (indice % 4 < 2 ? 'ESQUERDO' : 'DIREITO'),
    juntoJanela: assento.juntoJanela ?? [0, 3].includes(indice % 4)
  };
}

function adicionarCaixa(cena, dimensoes, posicao, cor, sombra = false) {
  const objecto = new THREE.Mesh(new THREE.BoxGeometry(...dimensoes), new THREE.MeshPhysicalMaterial({ color: cor, roughness: .32, clearcoat: .75 }));
  objecto.position.set(...posicao);
  objecto.receiveShadow = sombra;
  cena.add(objecto);
  return objecto;
}

function criarAssento3D(assento, x, z) {
  const grupo = new THREE.Group();
  grupo.position.set(x, .38, z);
  grupo.userData.assento = assento;
  const material = new THREE.MeshPhysicalMaterial({ color: assento.disponivel ? 0xeaf8ff : 0x879bab, roughness: .27, clearcoat: .85, emissive: 0x06243c, emissiveIntensity: .06 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.02, .28, .9), material);
  base.position.y = .28;
  const encosto = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.2, .28), material.clone());
  encosto.position.set(0, .92, .33);
  [base, encosto].forEach((objecto) => { objecto.castShadow = true; objecto.userData.grupoAssento = grupo; grupo.add(objecto); });

  const etiqueta = document.createElement('canvas');
  etiqueta.width = 96; etiqueta.height = 96;
  const contexto = etiqueta.getContext('2d');
  contexto.fillStyle = '#0875d7'; contexto.fillRect(12, 12, 72, 72);
  contexto.fillStyle = '#fff'; contexto.font = '700 42px sans-serif'; contexto.textAlign = 'center'; contexto.textBaseline = 'middle'; contexto.fillText(assento.numero, 48, 51);
  const textura = new THREE.CanvasTexture(etiqueta); textura.colorSpace = THREE.SRGBColorSpace;
  const numero = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, transparent: true }));
  numero.position.set(0, .95, .13); numero.scale.set(.48, .48, .48); grupo.add(numero);
  return grupo;
}
