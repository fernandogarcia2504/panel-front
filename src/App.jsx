import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Flota from './pages/Flota.jsx';
import Motocarro from './pages/Motocarro.jsx';
import Operacion from './pages/Operacion.jsx';
import Historico from './pages/Historico.jsx';
import Configuracion from './pages/Configuracion.jsx';

function Protegida({ children }) {
  const { user, cargando } = useAuth();
  if (cargando) return <div className="cargando">Cargando…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route path="/" element={<Flota />} />
        <Route path="/motocarros/:id" element={<Motocarro />} />
        <Route path="/operaciones/:id" element={<Operacion />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
