import { useCallback, useState } from 'react';
import { ESTADOS, colorDeRed } from '../utils.js';

// Tooltip que sigue al cursor (para las gráficas)
export function useTooltip() {
  const [tip, setTip] = useState(null);
  const mostrar = useCallback((e, contenido) => setTip({ x: e.clientX, y: e.clientY, contenido }), []);
  const ocultar = useCallback(() => setTip(null), []);
  const elemento = tip ? (
    <div
      className="tooltip"
      role="tooltip"
      style={{ left: Math.min(tip.x + 14, window.innerWidth - 260), top: tip.y + 14 }}
    >
      {tip.contenido}
    </div>
  ) : null;
  return [elemento, mostrar, ocultar];
}

export function EstadoChip({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.desconectado;
  return (
    <span className={`chip chip-${e.clase}`}>
      <span aria-hidden="true">{e.icono}</span> {e.etiqueta}
    </span>
  );
}

// Muestra (color) + nombre de la red; el color nunca va solo
export function RedChip({ red, redundantes, fuerte = true }) {
  if (!red) return <span className="muted">—</span>;
  return (
    <span className="red-chip">
      <span className="muestra" style={{ background: colorDeRed(red, redundantes) }} aria-hidden="true" />
      {fuerte ? <strong>{red.nombre}</strong> : red.nombre}
    </span>
  );
}

export function Stat({ titulo, valor, detalle, tono }) {
  return (
    <div className={`stat ${tono ? `stat-${tono}` : ''}`}>
      <span className="rotulo">{titulo}</span>
      <span className="stat-valor">{valor}</span>
      {detalle && <span className="muted pequeno">{detalle}</span>}
    </div>
  );
}

export function Leyenda({ items }) {
  return (
    <div className="leyenda">
      {items.map((i) => (
        <span key={i.nombre} className="leyenda-item">
          <span className="muestra" style={{ background: i.color }} aria-hidden="true" />
          {i.nombre}
        </span>
      ))}
    </div>
  );
}

export function Cargando() {
  return <div className="cargando">Cargando…</div>;
}
