import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';

export default function DashboardPage() {
  const [stats, setStats] = useState({ categories: 0, streams: 0, live: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.listCategories(), api.listStreams()])
      .then(([categories, streams]) => {
        setStats({
          categories: categories.length,
          streams: streams.length,
          live: streams.filter((item) => item.isLive).length,
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Control central"
        title="Ecosistema de streaming"
        description="Administra el catálogo que consumen Android TV, Samsung Tizen y LG webOS."
      />

      {error && <div className="status-message error">{error}</div>}

      <section className="stat-grid">
        <article className="stat-card">
          <span>Categorías</span>
          <strong>{stats.categories}</strong>
        </article>
        <article className="stat-card">
          <span>Contenidos</span>
          <strong>{stats.streams}</strong>
        </article>
        <article className="stat-card">
          <span>En vivo</span>
          <strong>{stats.live}</strong>
        </article>
      </section>

      <section className="info-panel">
        <h2>Flujo recomendado</h2>
        <ol>
          <li>Crea categorías y ordénalas.</li>
          <li>Sube una portada y registra el contenido.</li>
          <li>Para una fuente RTMP, agrega su salida HLS en playbackUrl.</li>
          <li>La TV descarga el catálogo desde <code>/api/v1/catalog</code>.</li>
        </ol>
      </section>
    </>
  );
}
