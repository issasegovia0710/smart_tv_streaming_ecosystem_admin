import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import CategoriesPage from './pages/CategoriesPage.jsx';
import StreamsPage from './pages/StreamsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function Layout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TV</span>
          <div>
            <strong>Stream Admin</strong>
            <small>Catálogo multipantalla</small>
          </div>
        </div>

        <nav>
          <NavLink to="/dashboard">Resumen</NavLink>
          <NavLink to="/categories">Categorías</NavLink>
          <NavLink to="/streams">Contenido</NavLink>
        </nav>

        <div className="sidebar-note">
          Publica HLS para máxima compatibilidad en TVs.
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/streams" element={<StreamsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
