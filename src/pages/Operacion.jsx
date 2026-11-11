// Reporte de una operación (una jornada de un motocarro)
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { usePeriodico, useRedundantes } from '../hooks.js';
import { Cargando, RedChip, Stat } from '../components/comunes.jsx';
import LineaTiempo from '../components/LineaTiempo.jsx';
import { colorDeRed, fmtBytes, fmtClave, fmtDur, fmtHHMM, fmtHora, fmtMs, fmtPct, plural, TIPOS_CAMBIO } from '../utils.js';

export default function Operacion() {
  const { id } = useParams();
  const redundantes = useRedundantes();
  // En curso se refresca cada 30 s; cerrada basta una vez
  const [datos, error] = usePeriodico(() => api.get(`/operaciones/${id}`), 30_000, [id]);

  if (error) return <div className="alerta">{error}</div>;
  if (!datos) return <Cargando />;
  const { operacion: op, agente, reporte: R } = datos;
  const T = R.totales;
  const maxRed = Math.max(1, ...R.porRed.map((r) => r.tiempoMs));

  return (
    <section>
      <Link to={`/motocarros/${agente.id}`} className="volver">
        ← {agente.nombre}
      </Link>
      <div className="encabezado">
        <div>
          <h1>
            {agente.nombre} · {fmtClave(op.clave)}
          </h1>
          <p className="muted subtitulo">
            Horario {fmtHHMM(op.inicio_programado)} – {fmtHHMM(op.fin_programado)} ·{' '}
            {op.estado === 'en_curso' ? 'operación en curso (se actualiza sola)' : 'operación cerrada'} · una sonda cada{' '}
            {R.intervaloMs / 1000} s
          </p>
        </div>
        <a className="btn btn-secundario btn-chico" href={`/api/operaciones/${op.id}/muestras.csv`}>
          Descargar muestras (CSV)
        </a>
      </div>

      <div className="stats">
        <Stat titulo="Starlink (principal)" valor={fmtPct(T.pctPrincipal)} detalle={fmtDur(T.principalMs)} tono="ok" />
        <Stat titulo="Redes redundantes" valor={fmtPct(T.pctRedundante)} detalle={fmtDur(T.redundanteMs)} tono={T.redundanteMs ? 'aviso' : undefined} />
        <Stat titulo="Sin conexión" valor={fmtDur(T.sinConexionMs)} detalle={T.cortes ? `${plural(T.cortes, 'corte', 'cortes')} · el más largo ${fmtDur(T.corteMasLargoMs)}` : 'ningún corte'} tono={T.sinConexionMs ? 'mal' : undefined} />
        <Stat titulo="Disponibilidad" valor={fmtPct(T.disponibilidad)} detalle={T.sinDatosMs ? `sin datos ${fmtDur(T.sinDatosMs)}` : 'todo el horario medido'} />
        <Stat titulo="Failovers" valor={T.failovers} detalle={`${T.retornos} retornos · ${T.cambiosEntreRedundantes} cambios entre SIM`} />
        <Stat titulo="Conmutación promedio" valor={fmtDur(T.conmutacionPromMs)} detalle={`máx. ${fmtDur(T.conmutacionMaxMs)} (± ${R.intervaloMs / 1000} s)`} />
        <Stat titulo="Datos transmitidos" valor={fmtBytes(T.bytesTotal)} detalle={`sondas ${fmtBytes(T.bytesSondas)} · velocidad ${fmtBytes(T.bytesVelocidad)}`} />
        <Stat titulo="Datos por SIM" valor={fmtBytes(T.bytesRedundantes)} detalle={`${T.muestras} sondas · ${fmtPct(T.pctExito)} exitosas`} />
      </div>

      <div className="tarjeta">
        <h2 className="h2-tarjeta">Por qué red salió durante la operación</h2>
        <LineaTiempo segmentos={R.segmentos} desde={R.periodo.desde} hasta={R.periodo.hasta} redundantes={redundantes} />
      </div>

      <div className="rejilla-2">
        <div className="tarjeta">
          <h2 className="h2-tarjeta">Tiempo por red</h2>
          <div className="barras-red">
            {R.porRed.map((r) => (
              <div key={r.clave} className="barra-red">
                <div className="barra-red-cab">
                  <RedChip red={r} redundantes={redundantes} />
                  <span>
                    <strong>{fmtDur(r.tiempoMs)}</strong> <span className="muted">· {fmtPct(r.pct)}</span>
                  </span>
                </div>
                <div className="barra-red-pista">
                  <div
                    className="barra-red-valor"
                    style={{ width: `${(r.tiempoMs / maxRed) * 100}%`, background: colorDeRed(r, redundantes) }}
                    title={`${r.nombre}: ${fmtDur(r.tiempoMs)}`}
                  />
                </div>
                {r.tipo !== 'sin_datos' && r.tipo !== 'sin_conexion' && (
                  <div className="muted pequeno">
                    latencia {fmtMs(r.latenciaProm)} (p95 {fmtMs(r.latenciaP95)}) · {fmtBytes(r.bytes)} · {r.ok} sondas
                    {r.asn && ` · AS${r.asn}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="tarjeta">
          <h2 className="h2-tarjeta">Latencia y calidad</h2>
          <div className="ficha-mini">
            <div>
              <span className="rotulo">Promedio</span>
              {fmtMs(T.latenciaProm)}
            </div>
            <div>
              <span className="rotulo">Mediana</span>
              {fmtMs(T.latenciaP50)}
            </div>
            <div>
              <span className="rotulo">p95</span>
              {fmtMs(T.latenciaP95)}
            </div>
            <div>
              <span className="rotulo">Máxima</span>
              {fmtMs(T.latenciaMax)}
            </div>
            <div>
              <span className="rotulo">Sondas exitosas</span>
              {T.exitosas} de {T.muestras}
            </div>
            <div>
              <span className="rotulo">Reinicios del agente/PC</span>
              {T.arranquesAgente}
            </div>
          </div>
          <p className="muted pequeno">
            Latencia = ida y vuelta de una petición HTTPS hasta la central, igual que la que haría la app.
          </p>
        </div>
      </div>

      <h2>Cambios de red ({R.cambios.length})</h2>
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Tipo</th>
              <th>De</th>
              <th>A</th>
              <th className="num">Conmutación</th>
              <th className="num">Sondas perdidas</th>
            </tr>
          </thead>
          <tbody>
            {R.cambios.map((c, i) => (
              <tr key={i}>
                <td>{fmtHora(c.hora)}</td>
                <td>
                  <span className={`chip chip-${c.tipo === 'failover' ? 'aviso' : c.tipo === 'retorno' ? 'ok' : 'neutro'}`}>
                    {TIPOS_CAMBIO[c.tipo]}
                  </span>
                </td>
                <td>
                  <RedChip red={c.de} redundantes={redundantes} fuerte={false} />
                </td>
                <td>
                  <RedChip red={c.a} redundantes={redundantes} />
                </td>
                <td className="num">{fmtDur(c.conmutacionMs)}</td>
                <td className="num">{c.muestrasFallidas}</td>
              </tr>
            ))}
            {!R.cambios.length && (
              <tr>
                <td colSpan={6} className="vacio">
                  Sin cambios de red: salió todo el tiempo por la misma red.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted pequeno">
        Conmutación = tiempo entre la última respuesta por la red anterior y la primera por la nueva (resolución ± un
        intervalo de medición).
      </p>

      <h2>Cortes de conexión ({R.cortes.length})</h2>
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Desde</th>
              <th>Hasta</th>
              <th className="num">Duración</th>
              <th>Red antes</th>
              <th>Red después</th>
            </tr>
          </thead>
          <tbody>
            {R.cortes.map((c, i) => (
              <tr key={i}>
                <td>{fmtHora(c.desde)}</td>
                <td>{c.abierto ? 'continúa' : fmtHora(c.hasta)}</td>
                <td className="num">{fmtDur(c.duracionMs)}</td>
                <td>{c.antes ?? '—'}</td>
                <td>{c.despues ?? '—'}</td>
              </tr>
            ))}
            {!R.cortes.length && (
              <tr>
                <td colSpan={5} className="vacio">
                  Ninguna sonda se perdió.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Pruebas de velocidad ({R.velocidad.length})</h2>
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Red</th>
              <th className="num">Bajada</th>
              <th className="num">Subida</th>
              <th className="num">Latencia</th>
              <th className="num">Datos</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {R.velocidad.map((v, i) => (
              <tr key={i}>
                <td>{fmtHora(v.hora)}</td>
                <td>
                  <RedChip red={{ nombre: v.red, tipo: v.tipo }} redundantes={redundantes} />
                </td>
                <td className="num">
                  <strong>{v.bajadaMbps != null ? `${v.bajadaMbps} Mbps` : '—'}</strong>
                </td>
                <td className="num">
                  <strong>{v.subidaMbps != null ? `${v.subidaMbps} Mbps` : '—'}</strong>
                </td>
                <td className="num">{fmtMs(v.latenciaMs)}</td>
                <td className="num">{fmtBytes(v.datosBytes)}</td>
                <td className="muted pequeno">
                  {v.motivo}
                  {v.errores?.length > 0 && <div className="texto-mal">{v.errores.join(' · ')}</div>}
                </td>
              </tr>
            ))}
            {!R.velocidad.length && (
              <tr>
                <td colSpan={7} className="vacio">
                  No hubo pruebas: solo se ejecutan cuando la salida cambia a una SIM.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
