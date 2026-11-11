// Línea de tiempo de una operación: por qué red salió el motocarro en cada momento
import { Leyenda, useTooltip } from './comunes.jsx';
import { colorDeRed, fmtDur, fmtHora } from '../utils.js';

export default function LineaTiempo({ segmentos, desde, hasta, redundantes, alto = 34, conEjes = true, compacta = false }) {
  const [tip, mostrar, ocultar] = useTooltip();
  const t0 = new Date(desde).getTime();
  const t1 = new Date(hasta).getTime();
  const total = Math.max(1, t1 - t0);

  // Marcas de hora: cada 1, 2, 3 o 6 h según la duración
  const horas = total / 3_600_000;
  const paso = (horas <= 2 ? 0.5 : horas <= 8 ? 1 : horas <= 16 ? 2 : horas <= 30 ? 3 : 6) * 3_600_000;
  const marcas = [];
  for (let t = Math.ceil(t0 / paso) * paso; t <= t1; t += paso) marcas.push(t);

  const nombres = [...new Map(segmentos.map((s) => [s.nombre, s])).values()];

  return (
    <div className={`linea-tiempo ${compacta ? 'compacta' : ''}`}>
      {!compacta && (
        <Leyenda items={nombres.map((s) => ({ nombre: s.nombre, color: colorDeRed(s, redundantes) }))} />
      )}
      <div className="lt-barra" style={{ height: alto }} onMouseLeave={ocultar}>
        {segmentos.map((s, i) => {
          const a = new Date(s.desde).getTime();
          const b = new Date(s.hasta).getTime();
          return (
            <div
              key={i}
              className="lt-seg"
              style={{
                left: `${((a - t0) / total) * 100}%`,
                width: `${((b - a) / total) * 100}%`,
                background: colorDeRed(s, redundantes),
              }}
              onMouseMove={(e) =>
                mostrar(
                  e,
                  <>
                    <strong>{s.nombre}</strong>
                    <div>
                      {fmtHora(a)} – {fmtHora(b)}
                    </div>
                    <div className="muted">{fmtDur(b - a)}</div>
                  </>
                )
              }
            />
          );
        })}
      </div>
      {conEjes && (
        <div className="lt-eje">
          {marcas.map((t) => (
            <span key={t} style={{ left: `${((t - t0) / total) * 100}%` }}>
              {new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      )}
      {tip}
    </div>
  );
}
