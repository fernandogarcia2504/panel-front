import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { olvidarRedes } from '../hooks.js';
import { Cargando, RedChip } from '../components/comunes.jsx';
import { DIAS, fmtFechaHora, hace } from '../utils.js';

const PESTANAS = [
  { id: 'motocarros', etiqueta: 'Motocarros' },
  { id: 'horario', etiqueta: 'Horario y medición' },
  { id: 'redes', etiqueta: 'Redes' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
];
const ZONAS = ['America/Mexico_City', 'America/Monterrey', 'America/Merida', 'America/Cancun', 'America/Chihuahua', 'America/Hermosillo', 'America/Mazatlan', 'America/Tijuana'];

export default function Configuracion() {
  const [pestana, setPestana] = useState('motocarros');
  return (
    <section>
      <div className="encabezado">
        <h1>Configuración</h1>
      </div>
      <div className="pestanas" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestana === p.id} className={pestana === p.id ? 'activa' : ''} onClick={() => setPestana(p.id)}>
            {p.etiqueta}
          </button>
        ))}
      </div>
      {pestana === 'motocarros' && <Motocarros />}
      {pestana === 'horario' && <HorarioYMedicion />}
      {pestana === 'redes' && <Redes />}
      {pestana === 'usuarios' && <Usuarios />}
    </section>
  );
}

// ---------------------------------------------------------------------------------
function EditorHorario({ valor, onChange }) {
  const set = (k, v) => onChange({ ...valor, [k]: v });
  const toggleDia = (d) => set('dias', valor.dias.includes(d) ? valor.dias.filter((x) => x !== d) : [...valor.dias, d].sort());
  const cruza = valor.fin <= valor.inicio;
  return (
    <div className="editor-horario">
      <label>
        Empieza
        <input type="time" value={valor.inicio} onChange={(e) => set('inicio', e.target.value)} required />
      </label>
      <label>
        Termina
        <input type="time" value={valor.fin} onChange={(e) => set('fin', e.target.value)} required />
      </label>
      <label>
        Zona horaria
        <select value={valor.zona} onChange={(e) => set('zona', e.target.value)}>
          {[...new Set([valor.zona, ...ZONAS])].map((z) => (
            <option key={z} value={z}>
              {z.replace('America/', '').replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="dias">
        <legend>Días</legend>
        {DIAS.map((n, i) => (
          <label key={n} className="check">
            <input type="checkbox" checked={valor.dias.includes(i + 1)} onChange={() => toggleDia(i + 1)} />
            {n}
          </label>
        ))}
      </fieldset>
      {cruza && (
        <p className="muted pequeno ancho-completo">
          {valor.fin === valor.inicio ? 'Opera las 24 horas.' : `Turno nocturno: termina al día siguiente a las ${valor.fin}.`}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------
function Motocarros() {
  const { user } = useAuth();
  const [lista, setLista] = useState(null);
  const [global, setGlobal] = useState(null);
  const [editando, setEditando] = useState(null); // {id?, nombre, notas, horario|null, activo}
  const [token, setToken] = useState(null); // {nombre, token}
  const [error, setError] = useState('');
  const admin = user?.rol === 'admin';

  const cargar = () => api.get('/agentes').then(setLista).catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
    api.get('/ajustes').then((d) => setGlobal(d.ajustes.horario));
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      const cuerpo = { nombre: editando.nombre, notas: editando.notas, horario: editando.horario, activo: editando.activo };
      if (editando.id) await api.put(`/agentes/${editando.id}`, cuerpo);
      else {
        const nuevo = await api.post('/agentes', cuerpo);
        setToken({ nombre: nuevo.nombre, token: nuevo.token });
      }
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function regenerar(a) {
    if (!window.confirm(`¿Generar un token nuevo para ${a.nombre}? El agente instalado dejará de reportar hasta que actualices su config.json.`)) return;
    try {
      const r = await api.post(`/agentes/${a.id}/token`);
      setToken({ nombre: a.nombre, token: r.token });
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(a) {
    const escrito = window.prompt(`Esto borra ${a.nombre} y TODO su histórico. Escribe el nombre para confirmar:`);
    if (escrito !== a.nombre) return;
    try {
      await api.del(`/agentes/${a.id}`, { confirmar: true });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!lista) return <Cargando />;
  return (
    <>
      {error && <div className="alerta">{error}</div>}
      {token && <TokenNuevo {...token} onCerrar={() => setToken(null)} />}

      {editando ? (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <h2 className="h2-tarjeta">{editando.id ? `Editar ${editando.nombre}` : 'Nuevo motocarro'}</h2>
          <div className="rejilla">
            <label>
              Nombre *
              <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} maxLength={60} required placeholder="Ej. Motocarro 07" />
            </label>
            <label>
              Notas
              <input value={editando.notas ?? ''} onChange={(e) => setEditando({ ...editando, notas: e.target.value })} maxLength={300} placeholder="Ruta, placas, responsable…" />
            </label>
            <label className="check ancho-completo">
              <input
                type="checkbox"
                checked={!!editando.horario}
                onChange={(e) => setEditando({ ...editando, horario: e.target.checked ? { ...global } : null })}
              />
              Horario propio (si no, usa el horario general de la flota)
            </label>
            {editando.horario && (
              <div className="ancho-completo">
                <EditorHorario valor={editando.horario} onChange={(h) => setEditando({ ...editando, horario: h })} />
              </div>
            )}
            {editando.id && (
              <label className="check ancho-completo">
                <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />
                Activo (si lo desactivas, la central rechaza sus reportes)
              </label>
            )}
          </div>
          <div className="acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="btn">{editando.id ? 'Guardar' : 'Crear y obtener token'}</button>
          </div>
        </form>
      ) : (
        admin && (
          <div className="acciones acciones-izq">
            <button className="btn" onClick={() => setEditando({ nombre: '', notas: '', horario: null, activo: true })}>
              Agregar motocarro
            </button>
          </div>
        )
      )}

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Motocarro</th>
              <th>Horario</th>
              <th>Agente</th>
              <th>Último reporte</th>
              {admin && <th />}
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} className={a.activo ? '' : 'inactivo'}>
                <td>
                  <strong>{a.nombre}</strong>
                  {!a.activo && <span className="chip chip-neutro">Desactivado</span>}
                  {a.notas && <div className="muted pequeno">{a.notas}</div>}
                </td>
                <td>
                  {a.horario ? (
                    <>
                      {a.horario.inicio}–{a.horario.fin} <span className="muted pequeno">· propio</span>
                    </>
                  ) : (
                    <span className="muted">General</span>
                  )}
                </td>
                <td>
                  {a.version ? `v${a.version}` : <span className="muted">sin instalar</span>}
                  {a.so && <div className="muted pequeno">{a.so}</div>}
                </td>
                <td>{a.ultimaVez ? `${hace(a.ultimaVez)} · ${fmtFechaHora(a.ultimaVez)}` : 'nunca'}</td>
                {admin && (
                  <td>
                    <div className="acciones-fila">
                      <button className="btn-link" onClick={() => setEditando({ ...a })}>
                        Editar
                      </button>
                      <button className="btn-link" onClick={() => regenerar(a)}>
                        Nuevo token
                      </button>
                      <button className="btn-link texto-mal" onClick={() => borrar(a)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={5} className="vacio">
                  Agrega el primer motocarro para obtener su token de instalación.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TokenNuevo({ nombre, token, onCerrar }) {
  // Dirección pública de la central (Heroku). Se define al compilar el panel en Vercel: VITE_CENTRAL_URL
  const central = import.meta.env.VITE_CENTRAL_URL || 'https://NOMBRE-DE-TU-APP.herokuapp.com';
  const config = JSON.stringify({ motocarro: nombre, central, token }, null, 2);
  const [copiado, setCopiado] = useState(false);
  const [descargado, setDescargado] = useState(false);
  // Archivo listo para la carpeta "configs" de la memoria USB de instalación
  const descargar = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([config + '\n'], { type: 'application/json' }));
    a.download = `config-${nombre.replace(/[^\w\- áéíóúÁÉÍÓÚñÑ]+/g, '_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setDescargado(true);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(config);
      setCopiado(true);
    } catch {
      /* el usuario puede seleccionarlo a mano */
    }
  };
  return (
    <div className="tarjeta token-nuevo">
      <h2 className="h2-tarjeta">Token de {nombre}</h2>
      <p>
        Descarga el archivo ahora: <strong>el token no se vuelve a mostrar</strong>. Ponlo en la carpeta{' '}
        <code>configs</code> de la memoria USB de instalación; el instalador lo mostrará en la lista de motocarros.
      </p>
      <pre className="codigo">{config}</pre>
      <div className="acciones">
        <button className="btn btn-secundario" onClick={copiar}>
          {copiado ? '✓ Copiado' : 'Copiar texto'}
        </button>
        <button className="btn btn-secundario" onClick={descargar}>
          {descargado ? '✓ Descargado' : 'Descargar archivo'}
        </button>
        <button className="btn" onClick={onCerrar}>
          Ya lo guardé
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------
function HorarioYMedicion() {
  const { user } = useAuth();
  const [a, setA] = useState(null);
  const [msg, setMsg] = useState({});
  useEffect(() => {
    api.get('/ajustes').then((d) => setA(d.ajustes));
  }, []);
  if (!a) return <Cargando />;
  const admin = user?.rol === 'admin';
  const set = (sec, k, v) => setA({ ...a, [sec]: { ...a[sec], [k]: v } });
  const num = (sec, k) => (e) => set(sec, k, e.target.value === '' ? '' : Number(e.target.value));

  async function guardar(sec) {
    setMsg({ ...msg, [sec]: '' });
    try {
      const r = await api.put(`/ajustes/${sec}`, a[sec]);
      setA(r.ajustes);
      setMsg({ ...msg, [sec]: '✓ Guardado. Los agentes lo toman en el próximo minuto.' });
    } catch (e) {
      setMsg({ ...msg, [sec]: e.message });
    }
  }
  const Pie = ({ sec }) => (
    <div className="acciones">
      {msg[sec] && <span className={msg[sec].startsWith('✓') ? 'texto-ok pequeno' : 'texto-mal pequeno'}>{msg[sec]}</span>}
      {admin && (
        <button className="btn" onClick={() => guardar(sec)}>
          Guardar
        </button>
      )}
    </div>
  );

  const porDia = Math.round((((a.medicion.tamanoMinimo || 350) + 1000) * 3600) / (a.medicion.intervaloSeg || 20));

  return (
    <>
      <div className="tarjeta">
        <h2 className="h2-tarjeta">Horario general de operación</h2>
        <p className="muted pequeno">Los agentes solo miden dentro de este horario. Cada motocarro puede tener uno propio.</p>
        <EditorHorario valor={a.horario} onChange={(h) => setA({ ...a, horario: h })} />
        <Pie sec="horario" />
      </div>

      <div className="tarjeta">
        <h2 className="h2-tarjeta">Medición</h2>
        <div className="rejilla rejilla-4">
          <label>
            Intervalo entre sondas (s)
            <input type="number" min="5" max="600" value={a.medicion.intervaloSeg} onChange={num('medicion', 'intervaloSeg')} />
          </label>
          <label>
            Tamaño mínimo de la sonda (bytes)
            <input type="number" min="0" max="20000" value={a.medicion.tamanoMinimo} onChange={num('medicion', 'tamanoMinimo')} />
          </label>
          <label>
            Tiempo límite (s)
            <input type="number" min="2" max="60" value={a.medicion.timeoutSeg} onChange={num('medicion', 'timeoutSeg')} />
          </label>
          <label>
            Latido fuera de horario (s, 0 = no)
            <input type="number" min="0" max="3600" value={a.medicion.latidoFueraSeg} onChange={num('medicion', 'latidoFueraSeg')} />
          </label>
        </div>
        <p className="muted pequeno">
          Consumo aproximado de las sondas: ~{(porDia / 1024 / 1024).toFixed(1)} MB por hora de operación por motocarro.
          Intervalos más cortos detectan los failovers con más precisión (± intervalo).
        </p>
        <Pie sec="medicion" />
      </div>

      <div className="tarjeta">
        <h2 className="h2-tarjeta">Prueba de velocidad al cambiar a SIM</h2>
        <div className="rejilla rejilla-4">
          <label className="check ancho-completo">
            <input type="checkbox" checked={a.velocidad.alCambiarASim} onChange={(e) => set('velocidad', 'alCambiarASim', e.target.checked)} />
            Medir la velocidad una vez cada vez que la salida cambie a una red redundante
          </label>
          <label>
            Esperar antes de medir (s)
            <input type="number" min="0" max="600" value={a.velocidad.esperaSeg} onChange={num('velocidad', 'esperaSeg')} />
          </label>
          <label>
            Tamaño máximo por transferencia (MB)
            <input type="number" min="1" max="8" value={a.velocidad.maxMB} onChange={num('velocidad', 'maxMB')} />
          </label>
          <label className="ancho-2">
            Medir contra
            <select value={a.velocidad.destino} onChange={(e) => set('velocidad', 'destino', e.target.value)}>
              <option value="central">La central (funciona con la lista blanca del Peplink)</option>
              <option value="cloudflare">speed.cloudflare.com (hay que permitirlo en la lista blanca)</option>
            </select>
          </label>
        </div>
        <p className="muted pequeno">Consumo por prueba: hasta {(a.velocidad.maxMB * 2 + 1.25).toFixed(1)} MB de la SIM, aprox.</p>
        <Pie sec="velocidad" />
      </div>

      <div className="tarjeta">
        <h2 className="h2-tarjeta">Retención</h2>
        <label className="ancho-limitado">
          Conservar las muestras crudas (días)
          <input type="number" min="7" max="730" value={a.retencion.diasMuestras} onChange={num('retencion', 'diasMuestras')} />
        </label>
        <p className="muted pequeno">Los reportes de cada operación se conservan siempre; solo se borran las sondas individuales.</p>
        <Pie sec="retencion" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------
function Redes() {
  const { user } = useAuth();
  const [redes, setRedes] = useState(null);
  const [msg, setMsg] = useState('');
  const cargar = () => api.get('/redes').then(setRedes);
  useEffect(() => {
    cargar();
  }, []);
  if (!redes) return <Cargando />;
  const admin = user?.rol === 'admin';

  async function guardar(r) {
    setMsg('');
    try {
      await api.put(`/redes/${r.asn}`, { nombre: r.nombre, tipo: r.tipo });
      olvidarRedes();
      setMsg(`✓ ${r.nombre} guardada. Los reportes se recalculan con el nuevo nombre.`);
      cargar();
    } catch (e) {
      setMsg(e.message);
    }
  }
  const cambiar = (asn, k, v) => setRedes(redes.map((r) => (r.asn === asn ? { ...r, [k]: v, sucio: true } : r)));

  return (
    <>
      <p className="muted">
        Cada red se identifica por su número de sistema autónomo (AS) a partir de la IP pública con la que llega la sonda.
        Las nuevas se clasifican solas por su nombre registrado; aquí puedes corregir el nombre y si es principal o
        redundante. Por ejemplo, Bait sale por la red de Altán y puede aparecer con el AS de Altán.
      </p>
      {msg && <div className={msg.startsWith('✓') ? 'alerta alerta-ok' : 'alerta'}>{msg}</div>}
      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>AS</th>
              <th>Registrada como</th>
              <th>Nombre en el panel</th>
              <th>Tipo</th>
              <th>Vista por última vez</th>
              {admin && <th />}
            </tr>
          </thead>
          <tbody>
            {redes.map((r) => (
              <tr key={r.asn}>
                <td>AS{r.asn}</td>
                <td className="muted pequeno">{r.org ?? '—'}</td>
                <td>
                  {admin ? (
                    <input value={r.nombre} maxLength={60} onChange={(e) => cambiar(r.asn, 'nombre', e.target.value)} />
                  ) : (
                    <RedChip red={r} />
                  )}
                </td>
                <td>
                  {admin ? (
                    <select value={r.tipo} onChange={(e) => cambiar(r.asn, 'tipo', e.target.value)}>
                      <option value="principal">Principal</option>
                      <option value="redundante">Redundante</option>
                    </select>
                  ) : r.tipo === 'principal' ? (
                    'Principal'
                  ) : (
                    'Redundante'
                  )}
                  {r.auto && <div className="muted pequeno">automático</div>}
                </td>
                <td>{hace(r.ultimaVez)}</td>
                {admin && (
                  <td>
                    <button className="btn btn-chico" disabled={!r.sucio} onClick={() => guardar(r)}>
                      Guardar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------
function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState(null);
  const [nuevo, setNuevo] = useState(null);
  const [pass, setPass] = useState({ actual: '', nueva: '' });
  const [msg, setMsg] = useState('');
  const admin = user?.rol === 'admin';
  const cargar = () => (admin ? api.get('/usuarios').then(setLista) : setLista([]));
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/usuarios', nuevo);
      setNuevo(null);
      setMsg('✓ Usuario creado');
      cargar();
    } catch (err) {
      setMsg(err.message);
    }
  }
  async function alternar(u) {
    try {
      await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
      cargar();
    } catch (err) {
      setMsg(err.message);
    }
  }
  async function cambiarPass(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/auth/password', pass);
      setPass({ actual: '', nueva: '' });
      setMsg('✓ Contraseña actualizada');
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!lista) return <Cargando />;
  return (
    <>
      {msg && <div className={msg.startsWith('✓') ? 'alerta alerta-ok' : 'alerta'}>{msg}</div>}
      {admin && (
        <>
          {nuevo ? (
            <form className="tarjeta formulario" onSubmit={crear}>
              <div className="rejilla">
                <label>
                  Usuario *
                  <input value={nuevo.username} onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })} required />
                </label>
                <label>
                  Nombre *
                  <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
                </label>
                <label>
                  Contraseña * (mín. 10)
                  <input type="password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} minLength={10} required autoComplete="new-password" />
                </label>
                <label>
                  Rol
                  <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                    <option value="admin">Administrador</option>
                    <option value="lectura">Solo lectura</option>
                  </select>
                </label>
              </div>
              <div className="acciones">
                <button type="button" className="btn btn-secundario" onClick={() => setNuevo(null)}>
                  Cancelar
                </button>
                <button className="btn">Crear usuario</button>
              </div>
            </form>
          ) : (
            <div className="acciones acciones-izq">
              <button className="btn" onClick={() => setNuevo({ username: '', nombre: '', password: '', rol: 'lectura' })}>
                Agregar usuario
              </button>
            </div>
          )}
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                    <td>{u.username}</td>
                    <td>{u.nombre}</td>
                    <td>{u.rol === 'admin' ? 'Administrador' : 'Solo lectura'}</td>
                    <td>
                      {u.id !== user.id && (
                        <button className="btn-link" onClick={() => alternar(u)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <form className="tarjeta formulario" onSubmit={cambiarPass}>
        <h2 className="h2-tarjeta">Cambiar mi contraseña</h2>
        <div className="rejilla">
          <label>
            Actual
            <input type="password" value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} required autoComplete="current-password" />
          </label>
          <label>
            Nueva (mín. 10)
            <input type="password" value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} minLength={10} required autoComplete="new-password" />
          </label>
        </div>
        <div className="acciones">
          <button className="btn">Cambiar contraseña</button>
        </div>
      </form>
    </>
  );
}
