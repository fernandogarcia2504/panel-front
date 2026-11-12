// Configuración → InControl2: estado de la sincronización, plan de datos de la SIM y diagnóstico
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando } from './comunes.jsx';
import { fmtFechaHora, hace } from '../utils.js';

const NOMBRES = {
  dispositivos: 'Lista de routers',
  detalle: 'Detalle de cada router (GPS)',
  consumo_horario: 'Consumo por hora y por WAN',
  sim_usages: 'Consumo por SIM (experimental)',
};

export default function InControlConfig() {
  const { user } = useAuth();
  const admin = user?.rol === 'admin';
  const [estado, setEstado] = useState(null);
  const [plan, setPlan] = useState(null);
  const [diag, setDiag] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const cargar = () => {
    api.get('/incontrol/estado').then(setEstado).catch((e) => setError(e.message));
    api.get('/ajustes').then((d) => setPlan(d.ajustes.planSim));
  };
  useEffect(cargar, []);

  async function guardarPlan(e) {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api.put('/ajustes/planSim', {
        gbMensual: plan.gbMensual === '' ? null : plan.gbMensual,
        diaCorte: plan.diaCorte,
      });
      setPlan(r.ajustes.planSim);
      setMsg('✓ Plan guardado');
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function sincronizar() {
    setMsg('');
    try {
      const r = await api.post('/incontrol/sincronizar');
      setMsg(`✓ ${r.mensaje}`);
      setTimeout(cargar, 60_000);
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (error) return <div className="alerta">{error}</div>;
  if (!estado || !plan) return <Cargando />;

  return (
    <>
      {msg && <div className={msg.startsWith('✓') ? 'alerta alerta-ok' : 'alerta'}>{msg}</div>}

      {!estado.configurado && (
        <div className="alerta">
          InControl2 no está configurado. Llena <code>IC2_CLIENT_ID</code>, <code>IC2_CLIENT_SECRET</code>,{' '}
          <code>IC2_ORG_ID</code> e <code>IC2_GROUP_ID</code> en las variables de la central (Heroku → Settings → Config Vars)
          y reinicia.
        </div>
      )}

      <div className="tarjeta">
        <h2 className="h2-tarjeta">Sincronización</h2>
        <p className="muted pequeno">
          La central consulta InControl2 cada ~10 minutos, de nube a nube: no gasta datos de las SIM. {estado.routers} routers
          en InControl2, {estado.vinculados} enlazados a un motocarro por su número de serie.
        </p>
        <div className="tabla-wrap">
          <table className="tabla-simple">
            <thead>
              <tr>
                <th>Dato</th>
                <th>Última vez correcta</th>
                <th>Último error</th>
              </tr>
            </thead>
            <tbody>
              {estado.endpoints.map((e) => (
                <tr key={e.endpoint}>
                  <td>{NOMBRES[e.endpoint] ?? e.endpoint}</td>
                  <td>{e.ultimoOk ? `${hace(e.ultimoOk)} · ${fmtFechaHora(e.ultimoOk)}` : <span className="texto-mal">nunca</span>}</td>
                  <td>{e.error ? <span className="texto-mal pequeno">{e.error}</span> : <span className="muted">—</span>}</td>
                </tr>
              ))}
              {!estado.endpoints.length && (
                <tr>
                  <td colSpan={3} className="vacio">
                    Aún no se ha sincronizado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {admin && estado.configurado && (
          <div className="acciones">
            <button className="btn btn-secundario" onClick={sincronizar}>
              Sincronizar ahora
            </button>
          </div>
        )}
      </div>

      <form className="tarjeta formulario" onSubmit={guardarPlan}>
        <h2 className="h2-tarjeta">Plan de datos de la SIM</h2>
        <p className="muted pequeno">
          Se usa en el portal para el % del ciclo y la proyección al cierre. El límite real y las alertas de cuota se
          configuran en InControl2 (Bandwidth Allowance Monitor).
        </p>
        <div className="rejilla">
          <label>
            GB del plan por mes
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={plan.gbMensual ?? ''}
              disabled={!admin}
              onChange={(e) => setPlan({ ...plan, gbMensual: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Ej. 5"
            />
          </label>
          <label>
            Día de corte (1–28)
            <input
              type="number"
              min="1"
              max="28"
              value={plan.diaCorte}
              disabled={!admin}
              onChange={(e) => setPlan({ ...plan, diaCorte: Number(e.target.value) })}
            />
          </label>
        </div>
        {admin && (
          <div className="acciones">
            <button className="btn">Guardar</button>
          </div>
        )}
      </form>

      {admin && (
        <details className="tarjeta" onToggle={(e) => e.currentTarget.open && !diag && api.get('/incontrol/diagnostico').then(setDiag)}>
          <summary>
            <strong>Diagnóstico</strong> <span className="muted pequeno">· respuestas crudas de InControl2 y routers sin enlazar</span>
          </summary>
          {!diag ? (
            <Cargando />
          ) : (
            <>
              <h3 className="h2-tarjeta">Routers en InControl2 sin motocarro</h3>
              {diag.sinVincular.length ? (
                <ul>
                  {diag.sinVincular.map((d) => (
                    <li key={d.id}>
                      <strong>{d.nombre ?? '—'}</strong> · <span className="ip">S/N {d.sn}</span> · {d.estado}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Todos los routers están enlazados.</p>
              )}
              <p className="muted pequeno">
                Para enlazar uno, captura su número de serie en <strong>Inventario</strong>.
              </p>
              {diag.endpoints.map((e) => (
                <div key={e.endpoint}>
                  <h3 className="h2-tarjeta">{NOMBRES[e.endpoint] ?? e.endpoint}</h3>
                  {e.endpoint === 'consumo_horario' && (
                    <p className="muted pequeno">
                      Compara un valor de aquí con lo que muestra InControl2 para confirmar la unidad (variable{' '}
                      <code>IC2_UNIDAD_CONSUMO</code>, por defecto MB).
                    </p>
                  )}
                  <pre className="codigo codigo-scroll">{e.muestra ? JSON.stringify(e.muestra, null, 2).slice(0, 6000) : 'Sin muestra'}</pre>
                </div>
              ))}
            </>
          )}
        </details>
      )}
    </>
  );
}
