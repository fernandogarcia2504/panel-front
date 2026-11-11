import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <div className="marca">
          <span className="marca-icono" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 6.5a10 10 0 0 1 14 0M3.5 9a6.5 6.5 0 0 1 9 0M6 11.5a3 3 0 0 1 4 0" />
              <circle cx="8" cy="14" r="0.6" fill="currentColor" />
            </svg>
          </span>
          Monitor de red
        </div>
        <nav>
          <NavLink to="/" end>
            Flota
          </NavLink>
          <NavLink to="/historico">Histórico</NavLink>
          <NavLink to="/configuracion">Configuración</NavLink>
        </nav>
        <div className="usuario">
          <span>{user?.nombre}</span>
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
