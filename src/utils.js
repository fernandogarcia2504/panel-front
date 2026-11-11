// Formatos y colores compartidos

// Estado de la red → color de la paleta de estados (siempre acompañado de etiqueta, nunca solo color)
export const COLOR_TIPO = {
  principal: '#0ca30c', // good
  redundante: '#fab219', // warning
  redundante2: '#ec835a', // serious (segunda red redundante)
  sin_conexion: '#d03b3b', // critical
  sin_datos: '#c3c2b7', // neutro
  desconocida: '#c3c2b7',
};
export const TINTA_SOBRE = { redundante: '#0b0b0b', redundante2: '#ffffff' };

// Color estable por red: Starlink verde; redundantes ámbar/naranja según su AS (no según el orden de aparición)
export function colorDeRed(r, redundantes = []) {
  if (!r) return COLOR_TIPO.sin_datos;
  if (r.tipo === 'redundante') {
    const i = redundantes.indexOf(r.nombre);
    return i > 0 ? COLOR_TIPO.redundante2 : COLOR_TIPO.redundante;
  }
  return COLOR_TIPO[r.tipo] ?? COLOR_TIPO.sin_datos;
}

export function fmtDur(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${s % 60 && m < 10 ? ` ${s % 60} s` : ''}`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export const fmtMs = (n) => (n == null ? '—' : `${Math.round(n)} ms`);
export const fmtPct = (n) => (n == null ? '—' : `${n}%`);
export const fmtHora = (f) =>
  f ? new Date(f).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
export const fmtHHMM = (f) =>
  f ? new Date(f).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const fmtFechaHora = (f) =>
  f
    ? new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
export function fmtClave(clave) {
  if (!clave) return '—';
  const [y, m, d] = clave.slice(0, 10).split('-').map(Number);
  const fecha = new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  return clave.length > 10 ? `${fecha} · ${clave.slice(11, 13)}:${clave.slice(13, 15)}` : fecha;
}
export function hace(f) {
  if (!f) return 'nunca';
  const s = Math.round((Date.now() - new Date(f).getTime()) / 1000);
  if (s < 60) return `hace ${Math.max(s, 0)} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

export const ESTADOS = {
  operando: { etiqueta: 'Operando', clase: 'ok', icono: '●' },
  sin_senal: { etiqueta: 'Sin señal', clase: 'mal', icono: '▲' },
  en_espera: { etiqueta: 'Fuera de horario', clase: 'neutro', icono: '◐' },
  desconectado: { etiqueta: 'Desconectado', clase: 'neutro', icono: '○' },
  nunca: { etiqueta: 'Sin instalar', clase: 'neutro', icono: '○' },
  desactivado: { etiqueta: 'Desactivado', clase: 'neutro', icono: '–' },
};

export const TIPOS_CAMBIO = {
  failover: 'Failover',
  retorno: 'Retorno a principal',
  cambio: 'Cambio entre SIM',
};

// Fecha local YYYY-MM-DD (no UTC: en México después de las 18:00 el UTC ya es el día siguiente)
export const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
