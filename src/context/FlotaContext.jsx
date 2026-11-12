// Flota seleccionada en el panel ('' = todas). Se recuerda en este navegador.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const FlotaContext = createContext({ flotas: [], flota: '', setFlota: () => {}, recargar: () => {} });

function leer() {
  try {
    return localStorage.getItem('flota') ?? '';
  } catch {
    return '';
  }
}

export function FlotaProvider({ children }) {
  const { user } = useAuth();
  const [flotas, setFlotas] = useState([]);
  const [flota, setFlotaEstado] = useState(leer);

  const recargar = useCallback(() => {
    if (!user) return Promise.resolve();
    return api
      .get('/flotas')
      .then((lista) => {
        setFlotas(lista);
        // Si la flota guardada ya no existe, vuelve a "todas"
        setFlotaEstado((f) => (f && !lista.some((x) => String(x.id) === f) ? '' : f));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const setFlota = (f) => {
    const v = f ? String(f) : '';
    try {
      localStorage.setItem('flota', v);
    } catch {
      /* solo para esta visita */
    }
    setFlotaEstado(v);
  };

  const actual = flotas.find((x) => String(x.id) === flota) ?? null;
  return <FlotaContext.Provider value={{ flotas, flota, actual, setFlota, recargar }}>{children}</FlotaContext.Provider>;
}

export const useFlota = () => useContext(FlotaContext);

// Selector de flota para la barra superior
export function SelectorFlota() {
  const { flotas, flota, setFlota } = useFlota();
  if (flotas.length < 2) return null;
  return (
    <label className="selector-flota">
      <span className="sr-only">Flota</span>
      <select value={flota} onChange={(e) => setFlota(e.target.value)} aria-label="Flota">
        <option value="">Todas las flotas</option>
        {flotas
          .filter((f) => f.activa || String(f.id) === flota)
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
      </select>
    </label>
  );
}
