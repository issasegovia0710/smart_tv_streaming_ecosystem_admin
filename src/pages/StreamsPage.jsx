import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusMessage from '../components/StatusMessage.jsx';

const emptyForm = {
  title: '',
  description: '',
  sourceUrl: '',
  playbackUrl: '',
  streamType: 'hls',
  thumbnailUrl: '',
  isLive: false,
  isActive: true,
  categoryIds: [],
};

export default function StreamsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [streamData, categoryData] = await Promise.all([
        api.listStreams(),
        api.listCategories(),
      ]);
      setItems(streamData);
      setCategories(categoryData);
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleCategory(id) {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(id)
        ? current.categoryIds.filter((item) => item !== id)
        : [...current.categoryIds, id],
    }));
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      sourceUrl: item.sourceUrl || '',
      playbackUrl: item.playbackUrl === item.sourceUrl ? '' : (item.playbackUrl || ''),
      streamType: item.streamType,
      thumbnailUrl: item.thumbnailUrl || '',
      isLive: Boolean(item.isLive),
      isActive: Boolean(item.isActive),
      categoryIds: (item.categories || []).map((category) => Number(category.id)),
    });
    setThumbnailFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancel() {
    setEditingId(null);
    setForm(emptyForm);
    setThumbnailFile(null);
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    try {
      let thumbnailUrl = form.thumbnailUrl;
      if (thumbnailFile) {
        const upload = await api.uploadThumbnail(thumbnailFile);
        thumbnailUrl = upload.url;
      }

      const payload = {
        ...form,
        thumbnailUrl,
      };

      if (editingId) {
        await api.updateStream(editingId, payload);
      } else {
        await api.createStream(payload);
      }

      setStatus({
        error: '',
        success: editingId ? 'Contenido actualizado.' : 'Contenido creado.',
      });
      cancel();
      await load();
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar este contenido?')) return;
    try {
      await api.deleteStream(id);
      await load();
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Contenido y streams"
        description="Registra HLS, MP4, DASH o fuentes RTMP con una salida compatible para TV."
      />

      <StatusMessage {...status} />

      <section className="panel">
        <h2>{editingId ? 'Editar contenido' : 'Nuevo contenido'}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Título
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label>
            Tipo
            <select
              value={form.streamType}
              onChange={(e) => setForm({ ...form, streamType: e.target.value })}
            >
              <option value="hls">HLS / m3u8</option>
              <option value="mp4">MP4</option>
              <option value="dash">DASH / mpd</option>
              <option value="rtmp">RTMP (ingestión)</option>
              <option value="other">Otro</option>
            </select>
          </label>

          <label className="full">
            URL fuente
            <input
              required
              type="url"
              placeholder="https://... o rtmp://..."
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            />
          </label>

          <label className="full">
            URL de reproducción
            <input
              type="url"
              placeholder="Para RTMP, agrega aquí la salida .m3u8"
              value={form.playbackUrl}
              onChange={(e) => setForm({ ...form, playbackUrl: e.target.value })}
            />
          </label>

          <label className="full">
            Descripción
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label>
            URL de portada
            <input
              type="url"
              value={form.thumbnailUrl}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            />
          </label>

          <label>
            Subir portada
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
            />
          </label>

          <fieldset className="full category-picker">
            <legend>Categorías</legend>
            {categories.map((category) => (
              <label key={category.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(Number(category.id))}
                  onChange={() => toggleCategory(Number(category.id))}
                />
                {category.name}
              </label>
            ))}
          </fieldset>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isLive}
              onChange={(e) => setForm({ ...form, isLive: e.target.checked })}
            />
            Es transmisión en vivo
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Visible en la TV
          </label>

          <div className="form-actions full">
            <button className="primary" type="submit">
              {editingId ? 'Guardar cambios' : 'Crear contenido'}
            </button>
            {editingId && (
              <button className="ghost" type="button" onClick={cancel}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Listado</h2>
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="content-grid">
            {items.map((item) => (
              <article className="content-card" key={item.id}>
                <div className="content-thumb">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" />
                  ) : (
                    <span>Sin portada</span>
                  )}
                </div>
                <div className="content-card-body">
                  <div className="card-topline">
                    <span className="badge active">{item.streamType.toUpperCase()}</span>
                    {item.isLive && <span className="live-dot">EN VIVO</span>}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description || 'Sin descripción.'}</p>
                  <small>
                    {(item.categories || []).map((category) => category.name).join(' · ') || 'Sin categoría'}
                  </small>
                  <div className="row-actions">
                    <button className="ghost" onClick={() => edit(item)}>Editar</button>
                    <button className="danger" onClick={() => remove(item.id)}>Eliminar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
