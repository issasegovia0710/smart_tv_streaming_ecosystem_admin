import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusMessage from '../components/StatusMessage.jsx';

const PAGE_SIZE = 24;

const emptyForm = {
  title: '',
  description: '',
  sourceUrl: '',
  playbackUrl: '',
  streamType: 'hls',
  thumbnailUrl: '',
  isLive: true,
  isActive: true,
  startsAt: '',
  endsAt: '',
  categoryIds: [],
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function itemToForm(item) {
  return {
    title: item.title || '',
    description: item.description || '',
    sourceUrl: item.sourceUrl || '',
    playbackUrl:
      item.playbackUrl && item.playbackUrl !== item.sourceUrl
        ? item.playbackUrl
        : '',
    streamType: item.streamType || 'hls',
    thumbnailUrl: item.thumbnailUrl || '',
    isLive: Boolean(item.isLive),
    isActive: Boolean(item.isActive),
    startsAt: toDateTimeLocal(item.startsAt),
    endsAt: toDateTimeLocal(item.endsAt),
    categoryIds: (item.categories || []).map((category) => Number(category.id)),
  };
}

function loadExternalScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);

  const existing = document.querySelector(`script[data-stream-library="${globalName}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window[globalName]), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.streamLibrary = globalName;
    script.onload = () => resolve(window[globalName]);
    script.onerror = () => reject(new Error(`No se pudo cargar ${globalName}.`));
    document.head.appendChild(script);
  });
}

function Modal({ title, description, children, onClose, wide = false }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-card${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function StreamFormModal({ item, categories, onClose, onSaved, onTest }) {
  const [form, setForm] = useState(item ? itemToForm(item) : emptyForm);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleCategory(id) {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(id)
        ? current.categoryIds.filter((categoryId) => categoryId !== id)
        : [...current.categoryIds, id],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      let thumbnailUrl = form.thumbnailUrl.trim();
      if (thumbnailFile) {
        const upload = await api.uploadThumbnail(thumbnailFile);
        thumbnailUrl = upload.url;
      }

      const payload = {
        ...form,
        title: form.title.trim(),
        sourceUrl: form.sourceUrl.trim(),
        playbackUrl: form.playbackUrl.trim(),
        thumbnailUrl,
        description: form.description.trim(),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };

      if (item) {
        await api.updateStream(item.id, payload);
      } else {
        await api.createStream(payload);
      }

      await onSaved(item ? 'Contenido actualizado.' : 'Contenido creado.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  const previewUrl = form.playbackUrl.trim() || form.sourceUrl.trim();

  return (
    <Modal
      wide
      title={item ? `Editar: ${item.title}` : 'Agregar contenido'}
      description="Completa los datos del canal o video. La URL de reproducción puede quedar vacía si es igual a la fuente."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        {error && <div className="status-message error">{error}</div>}

        <div className="form-grid modal-form-grid">
          <label>
            Título
            <input
              required
              autoFocus
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
            />
          </label>

          <label>
            Tipo
            <select
              value={form.streamType}
              onChange={(event) => update('streamType', event.target.value)}
            >
              <option value="hls">HLS / m3u8</option>
              <option value="mp4">MP4</option>
              <option value="dash">DASH / mpd</option>
              <option value="rtmp">RTMP (ingestión)</option>
              <option value="web">WEB / Página integrada</option>
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
              onChange={(event) => update('sourceUrl', event.target.value)}
            />
          </label>

          <label className="full">
            URL de reproducción
            <input
              type="url"
              placeholder="Déjala vacía para usar la URL fuente"
              value={form.playbackUrl}
              onChange={(event) => update('playbackUrl', event.target.value)}
            />
          </label>

          <label className="full">
            Descripción
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </label>

          <label>
            URL de portada
            <input
              type="url"
              placeholder="https://.../portada.webp"
              value={form.thumbnailUrl}
              onChange={(event) => update('thumbnailUrl', event.target.value)}
            />
          </label>

          <label>
            Subir portada
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)}
            />
          </label>

          <label>
            Inicio programado
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => update('startsAt', event.target.value)}
            />
          </label>

          <label>
            Fin programado
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => update('endsAt', event.target.value)}
            />
          </label>

          <fieldset className="full category-picker modal-category-picker">
            <legend>Categorías</legend>
            {categories.length ? (
              categories.map((category) => (
                <label key={category.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(Number(category.id))}
                    onChange={() => toggleCategory(Number(category.id))}
                  />
                  {category.name}
                </label>
              ))
            ) : (
              <span className="muted">Primero crea una categoría.</span>
            )}
          </fieldset>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isLive}
              onChange={(event) => update('isLive', event.target.checked)}
            />
            Es transmisión en vivo
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update('isActive', event.target.checked)}
            />
            Visible en la TV
          </label>
        </div>

        <footer className="modal-actions">
          <button
            className="ghost"
            type="button"
            disabled={!previewUrl}
            onClick={() => onTest({
              title: form.title || 'Prueba de reproducción',
              playbackUrl: previewUrl,
              sourceUrl: form.sourceUrl,
              streamType: form.streamType,
            })}
          >
            Probar URL
          </button>
          <span className="modal-action-spacer" />
          <button className="ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : item ? 'Guardar cambios' : 'Agregar contenido'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function StreamTestModal({ item, onClose }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewMessage, setPreviewMessage] = useState('Preparando reproductor…');

  const url = item.playbackUrl || item.sourceUrl;
  const streamType = item.streamType || 'hls';
  const isWeb = streamType === 'web';
  const blockedByMixedContent =
    window.location.protocol === 'https:' && /^http:\/\//i.test(url);

  useEffect(() => {
    let cancelled = false;

    async function runProbe() {
      setLoading(true);
      setError('');
      try {
        const data = await api.testStream(url, streamType);
        if (!cancelled) setResult(data);
      } catch (probeError) {
        if (!cancelled) setError(probeError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    runProbe();
    return () => {
      cancelled = true;
    };
  }, [streamType, url]);

  useEffect(() => {
    if (!url) return undefined;

    if (isWeb) {
      setPreviewMessage('Cargando la página dentro del panel…');
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    let cancelled = false;

    async function preparePreview() {
      try {
        setPreviewMessage('Preparando reproductor…');

        if (blockedByMixedContent) {
          setPreviewMessage(
            'El navegador bloquea esta vista previa porque el panel usa HTTPS y la fuente usa HTTP. El diagnóstico del backend aparece a la derecha; la TV puede probarla directamente.',
          );
          return;
        }

        if (streamType === 'rtmp' || /^rtmps?:\/\//i.test(url)) {
          setPreviewMessage('RTMP no se reproduce en navegador. Usa la salida HLS o DASH.');
          return;
        }

        if (streamType === 'hls' || /\.m3u8(?:$|\?)/i.test(url)) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            setPreviewMessage('Fuente HLS lista. Presiona reproducir.');
            return;
          }

          const Hls = await loadExternalScript(
            'https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js',
            'Hls',
          );

          if (cancelled) return;
          if (!Hls?.isSupported()) {
            setPreviewMessage('Este navegador no puede previsualizar HLS.');
            return;
          }

          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          playerRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) setPreviewMessage('HLS listo. Presiona reproducir.');
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!cancelled && data?.fatal) {
              setPreviewMessage(`La vista previa HLS falló: ${data.type || 'error'}.`);
            }
          });
          return;
        }

        if (streamType === 'dash' || /\.mpd(?:$|\?)/i.test(url)) {
          const dashjs = await loadExternalScript(
            'https://cdn.jsdelivr.net/npm/dashjs@4.7.4/dist/dash.all.min.js',
            'dashjs',
          );

          if (cancelled) return;
          const player = dashjs.MediaPlayer().create();
          playerRef.current = player;
          player.initialize(video, url, false);
          setPreviewMessage('DASH listo. Presiona reproducir.');
          return;
        }

        video.src = url;
        setPreviewMessage('Fuente lista. Presiona reproducir.');
      } catch (previewError) {
        if (!cancelled) {
          setPreviewMessage(`No se pudo preparar la vista previa: ${previewError.message}`);
        }
      }
    }

    preparePreview();

    return () => {
      cancelled = true;
      const player = playerRef.current;
      try {
        if (typeof player?.destroy === 'function') player.destroy();
        if (typeof player?.reset === 'function') player.reset();
      } catch {
        // El reproductor ya estaba cerrado.
      }
      playerRef.current = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [blockedByMixedContent, isWeb, streamType, url]);

  return (
    <Modal
      wide
      title={`Probar: ${item.title || 'stream'}`}
      description={url}
      onClose={onClose}
    >
      <div className="test-layout">
        <div className="test-player-panel">
          {isWeb ? (
            <div className="web-preview-shell">
              <iframe
                key={url}
                className="web-preview-frame"
                src={url}
                title={`Vista previa de ${item.title || 'página web'}`}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => setPreviewMessage('Página cargada dentro del panel.')}
              />
            </div>
          ) : (
            <video ref={videoRef} className="stream-preview" controls playsInline />
          )}
          <p className="test-help">{previewMessage}</p>
          <p className="test-note">
            {isWeb
              ? 'La página permanece dentro del panel. Algunos sitios pueden impedir ser mostrados en un iframe mediante sus políticas de seguridad.'
              : 'La prueba del servidor y la vista previa del navegador son independientes. Una fuente puede bloquear CORS en el navegador y aun funcionar en la TV.'}
          </p>
        </div>

        <aside className="probe-panel">
          <h3>Diagnóstico del backend</h3>
          {loading && <p className="muted">Comprobando URL…</p>}
          {error && <div className="status-message error">{error}</div>}
          {result && (
            <>
              <div className={`probe-verdict ${result.looksPlayable ? 'ok' : 'bad'}`}>
                {result.looksPlayable
                  ? (isWeb ? 'Página accesible' : 'Fuente válida')
                  : 'Revisar fuente'}
              </div>
              <dl className="probe-details">
                <div><dt>Mensaje</dt><dd>{result.message}</dd></div>
                <div><dt>HTTP</dt><dd>{result.status ?? 'Sin respuesta'}</dd></div>
                <div><dt>Tipo detectado</dt><dd>{result.detectedType || 'Desconocido'}</dd></div>
                <div><dt>Content-Type</dt><dd>{result.contentType || 'No enviado'}</dd></div>
                {result.hls && (
                  <>
                    <div><dt>Manifiesto HLS</dt><dd>{result.hls.valid ? 'Válido' : 'Inválido'}</dd></div>
                    <div><dt>Variantes</dt><dd>{result.hls.variantCount}</dd></div>
                    <div><dt>Segmentos encontrados</dt><dd>{result.hls.segmentCount}</dd></div>
                  </>
                )}
                {result.child && (
                  <div>
                    <dt>Primera variante/segmento</dt>
                    <dd>{result.child.ok ? `HTTP ${result.child.status}` : result.child.message || `HTTP ${result.child.status}`}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </aside>
      </div>
      <footer className="modal-actions">
        <span className="modal-action-spacer" />
        <button className="primary" type="button" onClick={onClose}>Cerrar</button>
      </footer>
    </Modal>
  );
}

export default function StreamsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [testingItem, setTestingItem] = useState(null);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, activeFilter]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');

    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.title?.toLocaleLowerCase('es').includes(normalizedQuery) ||
        item.description?.toLocaleLowerCase('es').includes(normalizedQuery) ||
        item.playbackUrl?.toLocaleLowerCase('es').includes(normalizedQuery);

      const matchesCategory =
        !categoryFilter ||
        (item.categories || []).some(
          (category) => String(category.id) === categoryFilter,
        );

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && Boolean(item.isActive)) ||
        (activeFilter === 'inactive' && !Boolean(item.isActive));

      return matchesQuery && matchesCategory && matchesActive;
    });
  }, [activeFilter, categoryFilter, items, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function onSaved(message) {
    setFormOpen(false);
    setEditingItem(null);
    setStatus({ error: '', success: message });
    await load({ silent: true });
  }

  async function remove(item) {
    if (!window.confirm(`¿Eliminar "${item.title}"?`)) return;

    try {
      await api.deleteStream(item.id);
      setStatus({ error: '', success: 'Contenido eliminado.' });
      await load({ silent: true });
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  async function toggleActive(item) {
    try {
      await api.updateStream(item.id, { isActive: !Boolean(item.isActive) });
      setStatus({
        error: '',
        success: item.isActive ? 'Contenido ocultado de la TV.' : 'Contenido activado.',
      });
      await load({ silent: true });
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Contenido y streams"
        description="Busca, prueba, agrega y edita canales sin recorrer formularios interminables."
        action={(
          <button className="primary header-action" type="button" onClick={openCreate}>
            + Agregar contenido
          </button>
        )}
      />

      <StatusMessage {...status} />

      <section className="panel content-manager-panel">
        <div className="content-toolbar">
          <label className="search-field">
            <span>Buscar</span>
            <input
              type="search"
              placeholder="Nombre, descripción o URL"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label>
            <span>Categoría</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Visibilidad</span>
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Visibles</option>
              <option value="inactive">Ocultos</option>
            </select>
          </label>

          <button className="ghost toolbar-refresh" type="button" onClick={() => load()}>
            Actualizar
          </button>
        </div>

        <div className="list-summary">
          <strong>{filteredItems.length}</strong> contenidos encontrados
        </div>

        {loading ? (
          <div className="loading-state">Cargando contenido…</div>
        ) : visibleItems.length ? (
          <div className="stream-table-wrap">
            <table className="stream-table">
              <thead>
                <tr>
                  <th>Contenido</th>
                  <th>Tipo</th>
                  <th>Categorías</th>
                  <th>Estado</th>
                  <th className="actions-column">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="stream-cell">
                        <div className="stream-mini-thumb">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" />
                          ) : (
                            <span>▶</span>
                          )}
                        </div>
                        <div className="stream-cell-copy">
                          <strong>{item.title}</strong>
                          <small title={item.playbackUrl}>{item.playbackUrl || item.sourceUrl}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge active">{item.streamType?.toUpperCase()}</span>
                      {item.isLive && <span className="live-dot table-live">EN VIVO</span>}
                    </td>
                    <td>
                      <div className="category-chips">
                        {(item.categories || []).length
                          ? item.categories.map((category) => (
                              <span key={category.id}>{category.name}</span>
                            ))
                          : <span className="muted">Sin categoría</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`visibility-toggle ${item.isActive ? 'is-active' : 'is-inactive'}`}
                        onClick={() => toggleActive(item)}
                      >
                        {item.isActive ? 'Visible' : 'Oculto'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions compact-actions">
                        <button className="test-button" type="button" onClick={() => setTestingItem(item)}>
                          Probar
                        </button>
                        <button className="ghost" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="danger" type="button" onClick={() => remove(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-manager-state">
            <strong>No hay contenido con esos filtros.</strong>
            <p>Limpia los filtros o agrega un canal nuevo.</p>
            <button className="primary" type="button" onClick={openCreate}>Agregar contenido</button>
          </div>
        )}

        {filteredItems.length > PAGE_SIZE && (
          <div className="pagination">
            <button
              className="ghost"
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <span>Página {safePage} de {totalPages}</span>
            <button
              className="ghost"
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>

      {formOpen && (
        <StreamFormModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSaved={onSaved}
          onTest={(item) => setTestingItem(item)}
        />
      )}

      {testingItem && (
        <StreamTestModal item={testingItem} onClose={() => setTestingItem(null)} />
      )}
    </>
  );
}
