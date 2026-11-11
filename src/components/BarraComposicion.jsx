// Barra 100% con la composición del tiempo por red (con separación de 2 px entre tramos y tooltip)
import { useTooltip } from './comunes.jsx';
import { colorDeRed, fmtDur } from '../utils.js';

export default function BarraComposicion({ redes, redundantes, alto = 12 }) {
  const [tip, mostrar, ocultar] = useTooltip();
  const total = redes.reduce((a, r) => a + r.tiempoMs, 0) || 1;
  return (
    <div className="barra-comp" style={{ height: alto }} onMouseLeave={ocultar}>
      {redes
        .filter((r) => r.tiempoMs > 0)
        .map((r) => (
          <div
            key={r.nombre}
            className="barra-comp-seg"
            style={{ flexGrow: r.tiempoMs / total, background: colorDeRed(r, redundantes) }}
            onMouseMove={(e) =>
              mostrar(
                e,
                <>
                  <strong>{r.nombre}</strong>
                  <div>
                    {fmtDur(r.tiempoMs)} · {Math.round((r.tiempoMs / total) * 1000) / 10}%
                  </div>
                </>
              )
            }
          />
        ))}
      {tip}
    </div>
  );
}
