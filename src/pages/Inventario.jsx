// Inventario homologado de la flota (solo administradores). Fase 1: captura manual.
// El número de serie del Peplink es el que enlaza el motocarro con su router en InControl2.
import { useEffect, useState } from 'react';
import { api, qs } from '../api.js';
import { useFlota } from '../context/FlotaContext.jsx';
import { Cargando } from '../components/comunes.jsx';
import { fechaLocal, fmtFecha, fmtFechaHora } from '../utils.js';

const OPERADORES = ['Bait', 'AT&T', 'Telcel', 'Movistar', 'Altán'];

const GRUPOS = [
  {
    titulo: 'Motocarro',
    campos: [
      { k: 'placa', etiqueta: 'Placa de la moto', max: 20 },
      { k: 'fecha_instalacion', etiqueta: 'Fecha de instalación', tipo: 'date' },
    ],
  },
  {
    titulo: 'Equipos de red',
    campos: [
      { k: 'peplink_sn', etiqueta: 'Peplink: número de serie', max: 40, ayuda: 'Cópialo de InControl2 para que se enlace' },
      { k: 'starlink_sn', etiqueta: 'Starlink: número de serie', max: 60, ayuda: 'Cópialo de la cuenta de Starlink' },
    ],
  },
  {
    titulo: 'SIM 1',
    campos: [
      { k: 'sim1_operador', etiqueta: 'Operador', max: 40, lista: true },
      { k: 'sim1_iccid', etiqueta: 'ICCID', max: 30, modo: 'numeric' },
      { k: 'sim1_imsi', etiqueta: 'IMSI', max: 20, modo: 'numeric' },
    ],
  },
  {
    titulo: 'SIM 2',
    campos: [
      { k: 'sim2_operador', etiqueta: 'Operador', max: 40, lista: true },
      { k: 'sim2_iccid', etiqueta: 'ICCID', max: 30, modo: 'numeric' },
      { k: 'sim2_imsi', etiqueta: 'IMSI', max: 20, modo: 'numeric' },
    ],
  },
  {
    titulo: 'Tablets',
    campos: [
      { k: 'tablet1_sn', etiqueta: 'Tablet 1: número de serie', max: 60 },
      { k: 'tablet2_sn', etiqueta: 'Tablet 2: número de serie', max: 60 },
    ],
  },
];
const CLAVES = GRUPOS.flatMap((g) => g.campos.map((c) => c.k));

const Valor = ({ v }) => (v ? <span className="ip">{v}</span> : <span className="muted">—</span>);

export default function Inventario() {
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(null);
  const [bitacora, setBitacora] = useState(null); // { nombre, filas }
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');

  const { flota, flotas } = useFlota();
  const verFlota = !flota && flotas.length > 1;
  const cargar = () => api.get(`/inventario${qs({ flota })}`).then(setLista).catch((e) => setMsg(e.message));
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flota]);

  async function guardar(e) {
    e.preventDefault();
    setMsg('');
    try {
      const cuerpo = Object.fromEntries(CLAVES.map((k) => [k, editando[k] ?? '']));
      const r = await api.put(`/inventario/${editando.agenteId}`, cuerpo);
      setMsg(r.cambios ? `✓ ${editando.nombre}: ${r.cambios} ${r.cambios === 1 ? 'campo actualizado' : 'campos actualizados'}` : `✓ ${editando.nombre}: sin cambios`);
      setEditando(null);
      cargar();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function verBitacora(a) {
    try {
      setBitacora({ nombre: a.nombre, filas: await api.get(`/inventario/${a.agenteId}/bitacora`) });
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!lista) return msg ? <div className="alerta">{msg}</div> : <Cargando />;
  const filtro = busca.trim().toLowerCase();
  const visibles = filtro
    ? lista.filter((a) => [a.nombre, a.flota, ...CLAVES.map((k) => a[k])].some((v) => String(v ?? '').toLowerCase().includes(filtro)))
    : lista;
  const sinEnlace = lista.filter((a) => a.peplink_sn && !a.ic2Id).length;

  return (
    <section>
      <div className="encabezado">
        <div>
          <h1>Inventario</h1>
          <p className="muted subtitulo">
            Números de serie y SIM de cada motocarro. El nombre es el mismo del motocarro en el portal, en InControl2 y en
            Starlink. Cada cambio queda en la bitácora.
          </p>
        </div>
      </div>

      {msg && <div className={msg.startsWith('✓') ? 'alerta alerta-ok' : 'alerta'}>{msg}</div>}
      {sinEnlace > 0 && (
        <div className="alerta">
          {sinEnlace} {sinEnlace === 1 ? 'motocarro tiene' : 'motocarros tienen'} un número de serie de Peplink que no aparece
          en InControl2. Revisa que esté copiado igual que en InControl2.
        </div>
      )}

      {editando && (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <h2 className="h2-tarjeta">Inventario de {editando.nombre}</h2>
          <datalist id="operadores">
            {OPERADORES.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          {GRUPOS.map((g) => (
            <fieldset key={g.titulo} className="grupo-inventario">
              <legend>{g.titulo}</legend>
              <div className="rejilla">
                {g.campos.map((c) => (
                  <label key={c.k}>
                    {c.etiqueta}
                    <input
                      type={c.tipo ?? 'text'}
                      value={editando[c.k] ?? ''}
                      maxLength={c.max}
                      max={c.tipo === 'date' ? fechaLocal() : undefined}
                      inputMode={c.modo}
                      list={c.lista ? 'operadores' : undefined}
                      onChange={(e) => setEditando({ ...editando, [c.k]: e.target.value })}
                    />
                    {c.ayuda && <span className="muted pequeno">{c.ayuda}</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="btn">Guardar</button>
          </div>
        </form>
      )}

      {bitacora && (
        <div className="tarjeta">
          <div className="encabezado">
            <h2 className="h2-tarjeta">Bitácora de {bitacora.nombre}</h2>
            <button className="btn-link" onClick={() => setBitacora(null)}>
              Cerrar
            </button>
          </div>
          {bitacora.filas.length ? (
            <div className="tabla-wrap">
              <table className="tabla-simple bitacora-lista">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {bitacora.filas.map((f) => (
                    <tr key={f.id}>
                      <td>{fmtFechaHora(f.ts)}</td>
                      <td>{f.usuario}</td>
                      <td>{f.etiqueta}</td>
                      <td>
                        <Valor v={f.anterior} />
                      </td>
                      <td>
                        <Valor v={f.nuevo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Sin cambios registrados.</p>
          )}
        </div>
      )}

      <div className="filtros">
        <input type="search" placeholder="Buscar por nombre, placa, serie, ICCID…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar en el inventario" />
      </div>

      <div className="tabla-wrap">
        <table>
          <thead>
            <tr>
              <th>Motocarro</th>
              <th>Placa</th>
              <th>Peplink</th>
              <th>Starlink</th>
              <th>SIM 1</th>
              <th>SIM 2</th>
              <th>Tablets</th>
              <th>Instalación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.agenteId} className={a.activo ? '' : 'inactivo'}>
                <td className="sin-corte">
                  <strong>{a.nombre}</strong>
                  {verFlota && a.flota && <div className="muted pequeno">{a.flota}</div>}
                </td>
                <td>
                  <Valor v={a.placa} />
                </td>
                <td>
                  <Valor v={a.peplink_sn} />
                  {a.peplink_sn && (
                    <div className="pequeno">
                      {a.ic2Id ? (
                        <span className="texto-ok">✓ En InControl2{a.ic2Nombre && a.ic2Nombre !== a.nombre ? ` como “${a.ic2Nombre}”` : ''}</span>
                      ) : (
                        <span className="texto-mal">▲ No aparece en InControl2</span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <Valor v={a.starlink_sn} />
                </td>
                {[1, 2].map((n) => (
                  <td key={n} className="inv-celda-sim">
                    {a[`sim${n}_operador`] || a[`sim${n}_iccid`] ? (
                      <>
                        <strong>{a[`sim${n}_operador`] ?? '—'}</strong>
                        <div className="ip">ICCID {a[`sim${n}_iccid`] ?? '—'}</div>
                        <div className="ip muted">IMSI {a[`sim${n}_imsi`] ?? '—'}</div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                ))}
                <td>
                  <Valor v={a.tablet1_sn} />
                  <div>
                    <Valor v={a.tablet2_sn} />
                  </div>
                </td>
                <td>{a.fecha_instalacion ? fmtFecha(`${a.fecha_instalacion}T12:00:00`) : <span className="muted">—</span>}</td>
                <td>
                  <div className="acciones-fila">
                    <button className="btn-link" onClick={() => setEditando({ ...a })}>
                      Editar
                    </button>
                    <button className="btn-link" onClick={() => verBitacora(a)}>
                      Bitácora
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visibles.length && (
              <tr>
                <td colSpan={9} className="vacio">
                  {lista.length ? 'Sin resultados.' : 'Primero da de alta los motocarros en Configuración → Motocarros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
