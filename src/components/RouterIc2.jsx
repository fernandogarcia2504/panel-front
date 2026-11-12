// Piezas del panel con datos de InControl2 (router Peplink): estado, SIM, ciclo de datos y conciliación.
import { useState } from 'react';
import { api, qs } from '../api.js';
import { usePeriodico } from '../hooks.js';
import { Cargando, Stat } from './comunes.jsx';
import { fechaLocal, fmtBytes, fmtFecha, fmtFechaHora, fmtHoraBloque, hace } from '../utils.js';

const SENAL = ['Sin señal', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];

export function RouterChip({ estado }) {
  if (!estado) return <span className="chip chip-neutro">Sin datos</span>;
  const online = estado === 'online';
  return (
    <span className={`chip ${online ? 'chip-ok' : 'chip-mal'}`}>
      <span aria-hidden="true">{online ? '●' : '○'}</span> Router {online ? 'en línea' : 'sin conexión'}
    </span>
  );
}

// ¿La SIM está lista para un failover? (calculado en la central con lo que reporta InControl2, sin gastar datos)
export function SimChip({ celular }) {
  if (!celular) return <span className="chip chip-neutro">Sin SIM reportada</span>;
  if (celular.simDisponible === true) {
    return (
      <span className="chip chip-ok" title="Lista para failover">
        <span aria-hidden="true">✓</span> SIM lista
      </span>
    );
  }
  return (
    <span className="chip chip-mal" title={celular.simMotivo ?? ''}>
      <span aria-hidden="true">▲</span> SIM no disponible
    </span>
  );
}

// Barra de consumo del ciclo con proyección al cierre
export function CicloSim({ ciclo, compacto = false }) {
  if (!ciclo) return <span className="muted">—</span>;
  const pct = ciclo.pct;
  const tono = ciclo.pctProyeccion >= 100 || pct >= 90 ? 'mal' : pct >= 75 || ciclo.pctProyeccion >= 90 ? 'aviso' : 'ok';
  const color = { ok: 'var(--ok)', aviso: 'var(--aviso)', mal: 'var(--mal)' }[tono];
  if (compacto) {
    return (
      <span className="sin-corte">
        {fmtBytes(ciclo.bytes)}
        {pct != null && <span className={tono === 'ok' ? undefined : `texto-${tono}`}> · {pct}% del plan</span>}
      </span>
    );
  }
  return (
    <div className="ciclo-sim">
      <div className="ciclo-sim-cab">
        <strong>{fmtBytes(ciclo.bytes)}</strong>
        <span className="muted">
          {ciclo.planBytes ? `de ${fmtBytes(ciclo.planBytes)} (${pct}%)` : 'sin plan configurado'}
        </span>
      </div>
      {ciclo.planBytes && (
        <div className="ciclo-sim-pista" role="img" aria-label={`Consumo ${pct}% del plan, proyección ${ciclo.pctProyeccion}%`}>
          <span className="ciclo-sim-proy" style={{ width: `${Math.min(100, ciclo.pctProyeccion)}%` }} />
          <span className="ciclo-sim-uso" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        </div>
      )}
      <div className="muted pequeno">
        Ciclo {fmtFecha(ciclo.inicio)} – {fmtFecha(ciclo.fin)} · ritmo {fmtBytes(ciclo.bytesPorDia)}/día · proyección al
        cierre <strong className={tono === 'ok' ? undefined : `texto-${tono}`}>{fmtBytes(ciclo.proyeccion)}</strong>
        {ciclo.pctProyeccion != null && ` (${ciclo.pctProyeccion}%)`}
      </div>
    </div>
  );
}

// Tarjeta del router en la página del motocarro
export function TarjetaRouter({ agenteId, admin }) {
  const [d, error] = usePeriodico(() => api.get(`/incontrol/motocarros/${agenteId}`), 60_000, [agenteId]);
  if (error) return <div className="alerta">InControl2: {error}</div>;
  if (!d) return <Cargando />;
  if (!d.vinculado) {
    return (
      <div className="tarjeta vacio">
        Este motocarro no está enlazado con un router de InControl2.{' '}
        {admin ? (
          <>
            Captura el <strong>número de serie del Peplink</strong> en Inventario (cópialo de InControl2).
          </>
        ) : (
          'Pide a un administrador que capture el número de serie del Peplink en el inventario.'
        )}
      </div>
    );
  }
  const c = d.celular;
  return (
    <>
      <div className="tarjeta ficha-vivo">
        <div>
          <span className="rotulo">Router</span>
          <RouterChip estado={d.estado} />
          <div className="muted pequeno">
            {d.modelo ?? '—'} · fw {d.firmware ?? '—'}
            {admin && d.sn && ` · S/N ${d.sn}`}
          </div>
        </div>
        <div>
          <span className="rotulo">Sale por (InControl2)</span>
          <span>{d.wanActiva ?? '—'}</span>
          <div className="muted pequeno">{d.estado === 'online' ? `${d.clientes ?? 0} clientes conectados` : `visto ${hace(d.ultimaVez)}`}</div>
        </div>
        <div>
          <span className="rotulo">SIM de respaldo</span>
          <SimChip celular={c} />
          <div className="muted pequeno">{c?.simDisponible === false ? c.simMotivo : c ? `${c.operador ?? 'Operador ?'} · ${c.tecnologia ?? '—'}` : '—'}</div>
        </div>
        <div>
          <span className="rotulo">Señal celular</span>
          <span>{c?.senalBarras != null ? `${SENAL[c.senalBarras] ?? c.senalBarras} (${c.senalBarras}/5)` : '—'}</span>
          <div className="muted pequeno">
            {c ? `RSRP ${c.rsrp ?? '—'} dBm · SINR ${c.sinr ?? '—'} dB · RSRQ ${c.rsrq ?? '—'} dB` : '—'}
          </div>
        </div>
        <div>
          <span className="rotulo">Ubicación (GPS)</span>
          {d.ubicacion ? (
            <a href={`https://www.google.com/maps?q=${d.ubicacion.lat},${d.ubicacion.lon}`} target="_blank" rel="noreferrer">
              {d.ubicacion.lat.toFixed(5)}, {d.ubicacion.lon.toFixed(5)}
            </a>
          ) : (
            <span>—</span>
          )}
          <div className="muted pequeno">{d.ubicacion?.ts ? fmtFechaHora(d.ubicacion.ts) : ''}</div>
        </div>
      </div>

      {admin && c && (c.iccid || c.imsi || c.imei) && (
        <p className="muted pequeno">
          SIM activa: ICCID {c.iccid ?? '—'} · IMSI {c.imsi ?? '—'} · IMEI del módem {c.imei ?? '—'}
        </p>
      )}

      <div className="tarjeta">
        <h3 className="h2-tarjeta">Datos de la SIM en el ciclo</h3>
        <CicloSim ciclo={d.ciclo} />
        {c?.cuotaExcedida && <div className="alerta">InControl2 reporta la cuota de datos de la SIM excedida.</div>}
      </div>

      <LineaSim lecturas={d.lecturas} />
      <ConsumoDiario dias={d.consumoDiario} />
    </>
  );
}

// Últimas 48 h: por dónde salía el router y si la SIM estaba lista, según cada lectura de InControl2
function LineaSim({ lecturas }) {
  if (!lecturas?.length) return null;
  const cambios = lecturas.filter((l, i) => i === 0 || l.wanActiva !== lecturas[i - 1].wanActiva || l.simDisponible !== lecturas[i - 1].simDisponible || l.estado !== lecturas[i - 1].estado);
  return (
    <details className="tarjeta">
      <summary>
        <strong>Últimas 48 h en InControl2</strong> <span className="muted pequeno">· {cambios.length} cambios de estado</span>
      </summary>
      <div className="tabla-wrap">
        <table className="tabla-simple">
          <thead>
            <tr>
              <th>Desde</th>
              <th>Router</th>
              <th>Sale por</th>
              <th>SIM</th>
              <th className="num">Señal</th>
            </tr>
          </thead>
          <tbody>
            {[...cambios].reverse().map((l) => (
              <tr key={l.ts}>
                <td>{fmtFechaHora(l.ts)}</td>
                <td>{l.estado ?? '—'}</td>
                <td>{l.wanActiva ?? '—'}</td>
                <td>{l.simDisponible == null ? '—' : l.simDisponible ? 'Lista' : `No disponible${l.celularEstado ? ` (${l.celularEstado})` : ''}`}</td>
                <td className="num">{l.senalBarras ?? '—'}/5</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ConsumoDiario({ dias }) {
  if (!dias?.length) return null;
  const max = Math.max(1, ...dias.map((d) => d.celular));
  return (
    <details className="tarjeta">
      <summary>
        <strong>Consumo diario de la SIM (30 días, InControl2)</strong>
      </summary>
      <div className="barras-red">
        {[...dias].reverse().map((d) => (
          <div key={d.dia} className="barra-red">
            <div className="barra-red-cab">
              <span>{fmtFecha(`${d.dia}T12:00:00`)}</span>
              <span>
                {fmtBytes(d.celular)} <span className="muted pequeno">SIM · {fmtBytes(d.otras)} Starlink/otras</span>
              </span>
            </div>
            <div className="barra-red-pista">
              <div className="barra-red-valor" style={{ width: `${(d.celular / max) * 100}%`, background: 'var(--red-sim1)' }} />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// Conciliación: consumo real de la SIM (InControl2) vs sondeos del portal, por hora
export function Conciliacion({ agenteId }) {
  const [rango, setRango] = useState({ desde: fechaLocal(new Date(Date.now() - 86400_000)), hasta: fechaLocal() });
  const [soloFailover, setSoloFailover] = useState(false);
  const [d, error] = usePeriodico(() => api.get(`/incontrol/motocarros/${agenteId}/consumo${qs(rango)}`), 300_000, [agenteId, rango.desde, rango.hasta]);

  const horas = (d?.horas ?? []).filter((h) => (soloFailover ? h.failover : h.t || h.p || h.failover));
  const t = d?.totales;
  return (
    <section className="conciliacion">
      <div className="encabezado">
        <div>
          <h2>Consumo real de la SIM vs sondeos</h2>
          <p className="muted subtitulo">
            Lo que InControl2 midió en la SIM comparado con lo que gastaron los sondeos del portal, hora por hora.
          </p>
        </div>
      </div>
      <div className="filtros">
        <label>
          Desde <input type="date" value={rango.desde} max={rango.hasta} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
        </label>
        <label>
          Hasta <input type="date" value={rango.hasta} min={rango.desde} max={fechaLocal()} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={soloFailover} onChange={(e) => setSoloFailover(e.target.checked)} /> Solo horas con failover
        </label>
      </div>
      {error && <div className="alerta">{error}</div>}
      {!d ? (
        !error && <Cargando />
      ) : !d.vinculado ? (
        <div className="tarjeta vacio">Sin router de InControl2 enlazado: solo se conocen los sondeos.</div>
      ) : (
        <>
          <div className="stats">
            <Stat titulo="SIM total (InControl2)" valor={fmtBytes(t.simBytes)} detalle={`${fmtBytes(t.simEnFailoverBytes)} en horas con failover`} />
            <Stat titulo="Sondeos por SIM" valor={fmtBytes(t.sondasSimBytes)} detalle={t.pctSondas != null ? `${t.pctSondas}% del consumo en failover` : `${t.minutosFailover} min en SIM`} />
            <Stat titulo="App médica (estimada)" valor={fmtBytes(t.appEstimadaBytes)} detalle="SIM − sondeos − línea base" />
            <Stat
              titulo="Sobrecarga del router"
              valor={fmtBytes(t.sobrecargaBytes)}
              detalle={`línea base ${fmtBytes(d.lineaBaseBytesHora)}/h (${d.horasLineaBase} h sin failover)`}
              tono={d.lineaBaseBytesHora > 1024 * 1024 ? 'aviso' : undefined}
            />
          </div>
          {t.horasInconsistentes > 0 && (
            <div className="alerta">
              En {t.horasInconsistentes} {t.horasInconsistentes === 1 ? 'hora' : 'horas'} los sondeos suman más que lo que InControl2
              reporta para la SIM. Suele ser consumo que InControl2 aún no recibe (llega con retraso y se vuelve a leer durante 48 h).
            </div>
          )}
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th className="num">Min. en SIM</th>
                  <th className="num">SIM (InControl2)</th>
                  <th className="num">Sondeos por SIM</th>
                  <th className="num">App médica (est.)</th>
                  <th className="num">% sondeos</th>
                </tr>
              </thead>
              <tbody>
                {[...horas].reverse().map((h) => (
                  <tr key={h.hora} className={h.inconsistente ? 'alerta-fila' : undefined}>
                    <td>{fmtHoraBloque(h.hora)}</td>
                    <td className="num">{h.failover ? h.minSim : <span className="muted">0</span>}</td>
                    <td className="num">{h.t == null ? <span className="muted">sin dato</span> : fmtBytes(h.t)}</td>
                    <td className="num">{fmtBytes(h.p)}</td>
                    <td className="num">{h.appEstimada == null ? <span className="muted">—</span> : fmtBytes(h.appEstimada)}</td>
                    <td className="num">{h.pctSondas == null ? <span className="muted">—</span> : `${h.pctSondas}%`}</td>
                  </tr>
                ))}
                {!horas.length && (
                  <tr>
                    <td colSpan={6} className="vacio">
                      Sin consumo de SIM en este rango.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted nota">
            “Min. en SIM” y “Sondeos” salen del portal; “SIM” sale de InControl2. La línea base es lo que gasta la SIM en espera
            (promedio de las horas medidas sin failover). App médica estimada = SIM − sondeos − línea base. InControl2 recibe el
            consumo cada ~15 min: las horas recientes pueden subir un poco al volver a leerse.
          </p>
        </>
      )}
    </section>
  );
}
