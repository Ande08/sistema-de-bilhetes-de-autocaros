import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { URL_SERVIDOR, libertarReservaAssento, listarAssentos, obterSessaoGuardada, reservarAssento } from '../servicos/api.js';

// Mantém várias reservas temporárias sincronizadas. Cada clique alterna um
// assento e o backend continua a arbitrar conflitos entre compradores.
export default function useSelecaoAssentosTempoReal(viagemId, aoErro) {
  const [assentos, setAssentos] = useState([]);
  const [assentoIds, setAssentoIds] = useState([]);
  const [aReservar, setAReservar] = useState(false);
  const assentosRef = useRef([]);
  assentosRef.current = assentoIds;

  const carregar = useCallback(async () => {
    if (!viagemId) return [];
    const lista = await listarAssentos(viagemId);
    setAssentos(lista);
    const meus = lista.filter((item) => item.reservadoPorMim).map((item) => item.id);
    setAssentoIds(meus);
    assentosRef.current = meus;
    return lista;
  }, [viagemId]);

  const seleccionar = useCallback(async (novoAssentoId) => {
    if (!viagemId || aReservar) return;
    const seleccionado = assentosRef.current.some((id) => String(id) === String(novoAssentoId));
    setAReservar(true);
    try {
      if (seleccionado) await libertarReservaAssento(viagemId, novoAssentoId);
      else await reservarAssento(viagemId, novoAssentoId);
      await carregar();
    } catch (erro) {
      await carregar().catch(() => {});
      aoErro?.(erro.message);
    } finally { setAReservar(false); }
  }, [viagemId, aReservar, carregar, aoErro]);

  const libertar = useCallback(async (assentoId = null) => {
    if (!viagemId) return;
    const ids = assentoId ? [assentoId] : [...assentosRef.current];
    if (!ids.length) return;
    await Promise.all(ids.map((id) => libertarReservaAssento(viagemId, id).catch(() => {})));
    await carregar().catch(() => {});
  }, [viagemId, carregar]);

  useEffect(() => {
    if (!viagemId) { setAssentos([]); setAssentoIds([]); assentosRef.current = []; return undefined; }
    let activo = true;
    carregar().catch((erro) => activo && aoErro?.(erro.message));

    const socket = io(URL_SERVIDOR, { auth: { token: obterSessaoGuardada()?.token } });
    socket.emit('assentos:entrar', viagemId, (resposta) => {
      if (!resposta?.sucesso && activo) aoErro?.(resposta?.mensagem || 'Não foi possível acompanhar os assentos em tempo real.');
    });
    socket.on('assentos:actualizado', () => carregar().catch(() => {}));
    const actualizacao = setInterval(() => carregar().catch(() => {}), 15000);
    const renovacao = setInterval(() => {
      Promise.all(assentosRef.current.map((id) => reservarAssento(viagemId, id)))
        .then(carregar).catch((erro) => aoErro?.(erro.message));
    }, 45000);

    return () => {
      activo = false; clearInterval(actualizacao); clearInterval(renovacao); socket.disconnect();
      assentosRef.current.forEach((id) => libertarReservaAssento(viagemId, id).catch(() => {}));
    };
  }, [viagemId, carregar, aoErro]);

  return { assentos, assentoIds, assentoId: assentoIds[0] || '', aReservar, seleccionar, libertar, actualizar: carregar };
}
