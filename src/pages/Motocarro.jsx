import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { usePeriodico, useRedundantes } from '../hooks.js';
import { Cargando, EstadoChip, RedChip, Stat } from '../components/comunes.jsx';
import BarraComposicion from '../components/BarraComposicion.jsx';
import { Conciliacion, TarjetaRouter } from '../components/RouterIc2.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fechaLocal, fmtBytes, fmtClave, fmtDur, fmtFechaHora, fmtMs, fmtPct, hace } from '../utils.js';

export default function Motocarro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const redundantes = useRedundantes();
  const [flota] = usePeriodico(() => api.get('/flota'), 15_000, [id]);
  const [ops, error] = usePeriodico(
    () => api.get(`/operaciones${qs({ agente: id, desde: fechaLocal(new Date(Date.now() - 89 * 86400_000)), hasta: fechaLocal() })}`),
    60_000,
    [id]
  );
  const a = flota?.agentes.find((x) => String(x.id) === id);

  if (error) return <div className="alerta">{error}</div>;
  if (!flota || !ops) return <Cargando />;
  if (!a) return <div className="alerta">Motocarro no encontrado</div>;

  const cerradas = ops.filter((o) => o.totales);
  const sum = (k) => cerradas.reduce((x, o) => x + (o.totales[k] ?? 0), 0);
  const dur = sum('duracionMs');

  return (
    <section>
      <Link to="/" className="volver">
        ← Flota
      </Link>
      <div className="encabezado">
        <div>
          <h1>{a.nombre}</h1>
          {(a.flota || a.notas) && <p className="muted subtitulo">{[a.flota, a.notas].filter(Boolean).join(' · ')}</p>}
        </div>
        <EstadoChip estado={a.estado} />
      </div>

      <div className="tarjeta ficha-vivo">
        <div>
          <span className="rotulo">Saliendo por</span>
          {a.estado === 'operando' || a.estado === 'en_espera' ? (
            <RedChip red={a.red} redundantes={redundantes} />
          ) : (
            <span className="muted">—</span>
          )}
          <div className="muted pequeno">
            {a.red.ip ?? '—'}
            {a.red.asn && ` · AS${a.red.asn}`}
            {a.red.colo && ` · Cloudflare ${a.red.colo}`}
          </div>
        </div>
        <div>
          <span className="rotulo">En esa red</span>
          <span>{a.red.desde ? hace(a.red.desde).replace('hace ', '') : '—'}</span>
        </div>
        <div>
          <span className="rotulo">Último reporte</span>
          <span>{hace(a.ultimaVez)}</span>
        </div>
        <div>
          <span className="rotulo">Agente</span>
          <span>
            {a.version ? `v${a.version}` : '—'} <span className="muted pequeno">{a.so}</span>
          </span>
        </div>
        <div>
          <span className="rotulo">Próxima operación</span>
          <span>{a.enHorario ? 'En horario ahora' : fmtFechaHora(a.proxima?.inicio)}</span>
        </div>
      </div>

      <h2>Router y SIM (InControl2)</h2>
      <TarjetaRouter agenteId={id} admin={user?.rol === 'admin'} />

      <h2>Últimos 90 días</h2>
      <div className="stats">
        <Stat titulo="Operaciones" valor={cerradas.length} />
        <Stat titulo="En Starlink" valor={dur ? fmtPct(Math.round((sum('principalMs') / dur) * 1000) / 10) : '—'} detalle={fmtDur(sum('principalMs'))} />
        <Stat titulo="Failovers" valor={sum('failovers')} detalle={`${sum('cortes')} cortes`} />
        <Stat titulo="Datos usados" valor={fmtBytes(sum('bytesTotal'))} detalle={`${fmtBytes(sum('bytesRedundantes'))} por SIM`} />
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Operación</th>
              <th style={{ width: '22%' }}>Redes</th>
              <th className="num">Starlink</th>
              <th className="num">Failovers</th>
              <th className="num">Conmutación</th>
              <th className="num">Sin conexión</th>
              <th className="num">Datos</th>
              <th className="num">Latencia p95</th>
            </tr>
          </thead>
          <tbody>
            {ops.map((o) => (
              <tr key={o.id} className="clicable" onClick={() => navigate(`/operaciones/${o.id}`)}>
                <td>
                  <strong>{fmtClave(o.clave)}</strong>
                  <div className="muted pequeno">{o.estado === 'en_curso' ? 'En curso' : 'Cerrada'}</div>
                </td>
                <td>
                  <BarraComposicion redes={o.redes} redundantes={redundantes} />
                </td>
                <td className="num">{fmtPct(o.totales?.pctPrincipal)}</td>
                <td className="num">{o.totales?.failovers ?? '—'}</td>
                <td className="num">{fmtDur(o.totales?.conmutacionPromMs)}</td>
                <td className="num">{fmtDur(o.totales?.sinConexionMs)}</td>
                <td className="num">
                  {fmtBytes(o.totales?.bytesTotal)}
                  <div className="muted pequeno">{fmtBytes(o.totales?.bytesRedundantes)} SIM</div>
                </td>
                <td className="num">{fmtMs(o.totales?.latenciaP95)}</td>
              </tr>
            ))}
            {!ops.length && (
              <tr>
                <td colSpan={8} className="vacio">
                  Sin operaciones registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Conciliacion agenteId={id} />
    </section>
  );
}
