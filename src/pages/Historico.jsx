// Histórico general de la flota
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useFlota } from '../context/FlotaContext.jsx';
import { usePeriodico, useRedundantes } from '../hooks.js';
import { Cargando, Leyenda, RedChip, Stat, useTooltip } from '../components/comunes.jsx';
import { COLOR_TIPO, fechaLocal, fmtBytes, fmtClave, fmtDur, fmtPct } from '../utils.js';

const PRESETS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
];
const hoy = () => fechaLocal();
const haceDias = (n) => fechaLocal(new Date(Date.now() - (n - 1) * 86400_000));

const SERIES = [
  { clave: 'principalMs', nombre: 'Starlink (principal)', color: COLOR_TIPO.principal },
  { clave: 'redundanteMs', nombre: 'SIM (redundantes)', color: COLOR_TIPO.redundante },
  { clave: 'sinConexionMs', nombre: 'Sin conexión', color: COLOR_TIPO.sin_conexion },
  { clave: 'sinDatosMs', nombre: 'Sin datos', color: COLOR_TIPO.sin_datos },
];

function GraficaDias({ dias }) {
  const [tip, mostrar, ocultar] = useTooltip();
  if (!dias.length) return <p className="vacio">Sin operaciones en el periodo.</p>;
  return (
    <div className="grafica-dias">
      <Leyenda items={SERIES} />
      <div className="gd-area">
        <div className="gd-eje-y" aria-hidden="true">
          {[100, 75, 50, 25, 0].map((v) => (
            <span key={v} style={{ bottom: `${v}%` }}>
              {v}%
            </span>
          ))}
        </div>
        <div className="gd-columnas" onMouseLeave={ocultar}>
          {[25, 50, 75].map((v) => (
            <div key={v} className="gd-rejilla" style={{ bottom: `${v}%` }} />
          ))}
          {dias.map((d) => {
            const total = d.duracionMs || 1;
            return (
              <div
                key={d.clave}
                className="gd-col"
                onMouseMove={(e) =>
                  mostrar(
                    e,
                    <>
                      <strong>{fmtClave(d.clave)}</strong>
                      {SERIES.map((s) => (
                        <div key={s.clave}>
                          <span className="muestra" style={{ background: s.color }} /> {s.nombre}:{' '}
                          {Math.round((d[s.clave] / total) * 1000) / 10}% ({fmtDur(d[s.clave])})
                        </div>
                      ))}
                      <div className="muted">
                        {d.operaciones} operaciones · {d.failovers} failovers
                      </div>
                    </>
                  )
                }
              >
                {SERIES.map((s) =>
                  d[s.clave] > 0 ? (
                    <div key={s.clave} className="gd-seg" style={{ flexGrow: d[s.clave] / total, background: s.color }} />
                  ) : null
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="gd-eje-x">
        {dias.map((d, i) => (
          <span key={d.clave}>
            {dias.length <= 14 || i % Math.ceil(dias.length / 10) === 0 ? d.clave.slice(5).split('-').reverse().join('/') : ''}
          </span>
        ))}
      </div>
      {tip}
    </div>
  );
}

export default function Historico() {
  const redundantes = useRedundantes();
  const [rango, setRango] = useState({ desde: haceDias(30), hasta: hoy() });
  const { flota } = useFlota();
  const [datos, error] = usePeriodico(() => api.get(`/operaciones/resumen${qs({ ...rango, flota })}`), 120_000, [rango.desde, rango.hasta, flota]);

  return (
    <section>
      <div className="encabezado">
        <div>
          <h1>Histórico de la flota</h1>
          <p className="muted subtitulo">Suma de todas las operaciones de todos los motocarros en el periodo.</p>
        </div>
      </div>

      <div className="filtros">
        {PRESETS.map((p) => {
          const activo = rango.desde === haceDias(p.dias) && rango.hasta === hoy();
          return (
            <button
              key={p.dias}
              className={`btn btn-chico ${activo ? '' : 'btn-secundario'}`}
              onClick={() => setRango({ desde: haceDias(p.dias), hasta: hoy() })}
            >
              {activo && '✓ '}
              {p.etiqueta}
            </button>
          );
        })}
        <label className="en-linea">
          Desde
          <input type="date" value={rango.desde} max={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
        </label>
        <label className="en-linea">
          Hasta
          <input type="date" value={rango.hasta} min={rango.desde} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
        </label>
      </div>

      {error && <div className="alerta">{error}</div>}
      {!datos ? (
        <Cargando />
      ) : (
        <>
          <div className="stats">
            <Stat titulo="Operaciones" valor={datos.totales.operaciones} />
            <Stat titulo="En Starlink" valor={fmtPct(datos.totales.pctPrincipal)} detalle={fmtDur(datos.totales.principalMs)} tono="ok" />
            <Stat titulo="En SIM" valor={fmtDur(datos.totales.redundanteMs)} detalle={`${fmtBytes(datos.totales.bytesRedundantes)} de datos por SIM`} tono={datos.totales.redundanteMs ? 'aviso' : undefined} />
            <Stat titulo="Disponibilidad" valor={fmtPct(datos.totales.disponibilidad)} detalle={`sin conexión ${fmtDur(datos.totales.sinConexionMs)}`} />
            <Stat titulo="Failovers" valor={datos.totales.failovers} detalle={`conmutación prom. ${fmtDur(datos.totales.conmutacionPromMs)}`} />
            <Stat titulo="Cortes" valor={datos.totales.cortes} />
            <Stat titulo="Datos totales" valor={fmtBytes(datos.totales.bytesTotal)} />
            <Stat titulo="Sin datos" valor={fmtDur(datos.totales.sinDatosMs)} detalle="PC apagada o sin agente" />
          </div>

          <div className="tarjeta">
            <h2 className="h2-tarjeta">Tiempo por día</h2>
            <GraficaDias dias={datos.porDia} />
          </div>

          <div className="rejilla-2">
            <div className="tarjeta">
              <h2 className="h2-tarjeta">Por red</h2>
              <table className="tabla-simple">
                <thead>
                  <tr>
                    <th>Red</th>
                    <th className="num">Tiempo</th>
                    <th className="num">Datos</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porRed.map((r) => (
                    <tr key={r.nombre}>
                      <td>
                        <RedChip red={r} redundantes={redundantes} fuerte={false} />
                      </td>
                      <td className="num">{fmtDur(r.tiempoMs)}</td>
                      <td className="num">{r.tipo === 'sin_datos' ? '—' : fmtBytes(r.bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tarjeta">
              <h2 className="h2-tarjeta">Motocarros con más failovers</h2>
              <table className="tabla-simple">
                <thead>
                  <tr>
                    <th>Motocarro</th>
                    <th className="num">Failovers</th>
                    <th className="num">Starlink</th>
                    <th className="num">Disponib.</th>
                    <th className="num">Datos SIM</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.porAgente.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/motocarros/${a.id}`}>{a.nombre}</Link>
                      </td>
                      <td className="num">{a.failovers}</td>
                      <td className="num">{fmtPct(a.pctPrincipal)}</td>
                      <td className="num">{fmtPct(a.disponibilidad)}</td>
                      <td className="num">{fmtBytes(a.bytesRedundantes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

