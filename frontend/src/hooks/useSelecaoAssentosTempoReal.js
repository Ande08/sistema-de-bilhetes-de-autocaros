import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { URL_SERVIDOR, libertarReservaAssento, listarAssentos, obterSessaoGuardada, reservarAssento } from '../servicos/api.js';

// Centraliza a reserva temporária, a renovação e a sincronização do mapa para
// que o passageiro e o atendente utilizem exatamente as mesmas garantias.
export default function useSelecaoAssentosTempoReal(viagemId, aoErro) {
  const [assentos, setAssentos] = useState([]);
  const [assentoId, setAssentoId] = useState('');
  const [aReservar, setAReservar] = useState(false);
  const assentoRef = useRef('');
  assentoRef.current = assentoId;

  const carregar = useCallback(async () => {
    if (!viagemId) return [];
    const lista = await listarAssentos(viagemId);
    setAssentos(lista);
    setAssentoId((actual) => {
      const aindaMeu = lista.find((item) => String(item.id) === String(actual) && item.reservadoPorMim);
      const meu = aindaMeu || lista.find((item) => item.reservadoPorMim);
      return meu?.id || '';
    });
    return lista;
  }, [viagemId]);

  const seleccionar = useCallback(async (novoAssentoId) => {
    if (!viagemId || aReservar || String(novoAssentoId) === String(assentoRef.current)) return;
    setAReservar(true);
    try {
      await reservarAssento(viagemId, novoAssentoId);
      setAssentoId(novoAssentoId);
      await carregar();
    } catch (erro) {
      await carregar().catch(() => {});
      aoErro?.(erro.message);
    } finally { setAReservar(false); }
  }, [viagemId, aReservar, carregar, aoErro]);

  const libertar = useCallback(async () => {
    const actual = assentoRef.current;
    if (!viagemId || !actual) return;
    assentoRef.current = '';
    setAssentoId('');
    await libertarReservaAssento(viagemId, actual).catch(() => {});
  }, [viagemId]);

  useEffect(() => {
    if (!viagemId) { setAssentos([]); setAssentoId(''); return undefined; }
    let activo = true;
    carregar().catch((erro) => activo && aoErro?.(erro.message));

    const socket = io(URL_SERVIDOR, { auth: { token: obterSessaoGuardada()?.token } });
    socket.emit('assentos:entrar', viagemId, (resposta) => {
      if (!resposta?.sucesso && activo) aoErro?.(resposta?.mensagem || 'Não foi possível acompanhar os assentos em tempo real.');
    });
    socket.on('assentos:actualizado', () => carregar().catch(() => {}));

    // A consulta periódica cobre expirações e eventuais reconexões do socket.
    const actualizacao = setInterval(() => carregar().catch(() => {}), 15000);
    // O bloqueio é renovado enquanto o utilizador permanece no fluxo de compra.
    const renovacao = setInterval(() => {
      if (assentoRef.current) reservarAssento(viagemId, assentoRef.current).then(carregar).catch((erro) => aoErro?.(erro.message));
    }, 45000);

    return () => {
      activo = false;
      clearInterval(actualizacao);
      clearInterval(renovacao);
      socket.disconnect();
      const actual = assentoRef.current;
      if (actual) libertarReservaAssento(viagemId, actual).catch(() => {});
    };
  }, [viagemId, carregar, aoErro]);

  return { assentos, assentoId, aReservar, seleccionar, libertar, actualizar: carregar };
}
