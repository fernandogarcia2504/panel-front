import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePeriodico, useRedundantes } from '../hooks.js';
import { Cargando, EstadoChip, RedChip, Stat } from '../components/comunes.jsx';
import { fmtBytes, fmtClave, fmtDur, fmtFechaHora, fmtPct, hace, plural, TIPOS_CAMBIO } from '../utils.js';

export default function Flota() {
  const navigate = useNavigate();
  const redundantes = useRedundantes();
  const [datos, error] = usePeriodico(() => api.get('/flota'), 10_000);

  if (!datos) return error ? <div className="alerta">{error}</div> : <Cargando />;
  const { resumen, agentes } = datos;

  return (
    <section>
      <div className="encabezado">
        <div>
          <h1>Flota en vivo</h1>
          <p className="muted subtitulo">Por qué red está saliendo cada motocarro ahora mismo. Se actualiza cada 10 s.</p>
        </div>
        <span className="muted pequeno">Actualizado {new Date(datos.generado).toLocaleTimeString('es-MX')}</span>
      </div>

      {error && <div className="alerta">Sin conexión con la central: {error}</div>}

      <div className="stats">
        <Stat titulo="Operando" valor={`${resumen.operando} / ${resumen.total}`} />
        <Stat titulo="En Starlink" valor={resumen.enPrincipal} tono={resumen.enPrincipal ? 'ok' : undefined} />
        <Stat titulo="En SIM (redundante)" valor={resumen.enRedundante} tono={resumen.enRedundante ? 'aviso' : undefined} />
        <Stat
          titulo="Sin señal"
          valor={resumen.sinSenal}
          tono={resumen.sinSenal ? 'mal' : undefined}
          detalle="en horario y sin reportarse"
        />
      </div>

      {!agentes.length ? (
        <div className="tarjeta vacio">
          Aún no hay motocarros. Dalos de alta en <strong>Configuración → Motocarros</strong>.
        </div>
      ) : (
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Motocarro</th>
                <th>Estado</th>
                <th>Saliendo por</th>
                <th className="num">Starlink hoy</th>
                <th className="num">Failovers</th>
                <th className="num">Sin conexión</th>
                <th className="num">Datos en SIM</th>
                <th>Último reporte</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((a) => {
                const t = a.operacion?.totales;
                const hoy = a.operacion && a.operacion.estado === 'en_curso';
                return (
                  <tr key={a.id} className="clicable" onClick={() => navigate(`/motocarros/${a.id}`)}>
                    <td className="sin-corte">
                      <strong>{a.nombre}</strong>
                      {a.notas && <div className="muted pequeno">{a.notas}</div>}
                    </td>
                    <td>
                      <EstadoChip estado={a.estado} />
                      {a.estado === 'en_espera' && a.proxima && (
                        <div className="muted pequeno">inicia {fmtFechaHora(a.proxima.inicio)}</div>
                      )}
                    </td>
                    <td>
                      {a.estado === 'operando' || a.estado === 'en_espera' ? (
                        <>
                          <RedChip red={a.red} redundantes={redundantes} />
                          <div className="muted pequeno">
                            {a.red.ip}
                            {a.red.desde && ` · desde ${hace(a.red.desde).replace('hace ', '')}`}
                          </div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">{t ? fmtPct(t.pctPrincipal) : '—'}</td>
                    <td className="num">
                      {t ? t.failovers : '—'}
                      {a.operacion?.ultimoCambio && (
                        <div className="muted pequeno">
                          {TIPOS_CAMBIO[a.operacion.ultimoCambio.tipo]}{' '}
                          {new Date(a.operacion.ultimoCambio.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="num">{t ? plural(t.cortes, 'corte', 'cortes') : '—'}</td>
                    <td className="num">{t ? fmtBytes(t.bytesRedundantes) : '—'}</td>
                    <td>
                      {hace(a.ultimaVez)}
                      {!hoy && a.operacion && <div className="muted pequeno">datos de {fmtClave(a.operacion.clave)}</div>}
                      {Math.abs(a.desfaseMs ?? 0) > 120_000 && (
                        <div className="pequeno texto-aviso">Reloj de la PC desfasado {fmtDur(Math.abs(a.desfaseMs))}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted nota">
        Las columnas de “hoy” son de la operación en curso (o de la última, si está fuera de horario). “Sin señal” =
        debería estar midiendo y no ha llegado nada en más de 3 intervalos: puede ser un corte de todas las redes o la
        PC apagada; al volver la conexión, el agente sube lo que midió mientras tanto.
      </p>
    </section>
  );
}
