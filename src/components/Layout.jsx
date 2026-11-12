import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Tema: lo que eligió el usuario (guardado en este navegador) o, si nunca eligió, el del sistema
function temaInicial() {
  try {
    const t = localStorage.getItem('tema');
    if (t === 'claro' || t === 'oscuro') return t;
  } catch {
    /* sin almacenamiento: usa el del sistema */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

function BotonTema() {
  const [tema, setTema] = useState(temaInicial);
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);
  const cambiar = () => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    try {
      localStorage.setItem('tema', nuevo);
    } catch {
      /* no se guarda, pero cambia en esta visita */
    }
    setTema(nuevo);
  };
  const aOscuro = tema !== 'oscuro';
  return (
    <button
      type="button"
      className="btn-tema"
      onClick={cambiar}
      aria-label={aOscuro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={aOscuro ? 'Modo oscuro' : 'Modo claro'}
    >
      {aOscuro ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const inicial = (user?.nombre || user?.username || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="app">
      <header className="topbar">
        <div className="marca">
          <span className="marca-icono" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
              <circle cx="12" cy="19.5" r="1" fill="currentColor" />
            </svg>
          </span>
          Monitor de red
        </div>
        <nav aria-label="Principal">
          <NavLink to="/" end>
            Flota
          </NavLink>
          <NavLink to="/historico">Histórico</NavLink>
          <NavLink to="/configuracion">Configuración</NavLink>
        </nav>
        <div className="usuario">
          <BotonTema />
          <span className="avatar" aria-hidden="true">
            {inicial}
          </span>
          <span className="nombre">{user?.nombre}</span>
          <button className="btn-link" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
