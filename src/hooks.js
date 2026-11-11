import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Nombres de las redes redundantes en orden estable (por AS) para asignarles color
let cacheRedes = null;
export function useRedundantes() {
  const [lista, setLista] = useState(cacheRedes ?? []);
  useEffect(() => {
    api
      .get('/redes')
      .then((r) => {
        cacheRedes = r
          .filter((x) => x.tipo === 'redundante')
          .sort((a, b) => a.asn - b.asn)
          .map((x) => x.nombre);
        setLista(cacheRedes);
      })
      .catch(() => {});
  }, []);
  return lista;
}
export const olvidarRedes = () => {
  cacheRedes = null;
};

// Carga periódica (pausada si la pestaña no está visible)
export function usePeriodico(cargar, cadaMs, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(cargar);
  ref.current = cargar;
  useEffect(() => {
    let vivo = true;
    let timer;
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const d = await ref.current();
          if (vivo) {
            setDatos(d);
            setError('');
          }
        } catch (e) {
          if (vivo) setError(e.message);
        }
      }
      if (vivo && cadaMs) timer = setTimeout(tick, cadaMs);
    };
    tick();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [datos, error, setDatos];
}
