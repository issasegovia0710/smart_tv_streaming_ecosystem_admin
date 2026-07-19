import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusMessage from '../components/StatusMessage.jsx';

const emptyForm = {
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.listCategories());
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      sortOrder: Number(item.sortOrder || 0),
      isActive: Boolean(item.isActive),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancel() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    try {
      if (editingId) {
        await api.updateCategory(editingId, form);
      } else {
        await api.createCategory(form);
      }
      setStatus({
        error: '',
        success: editingId ? 'Categoría actualizada.' : 'Categoría creada.',
      });
      cancel();
      await load();
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar esta categoría? El contenido no se elimina.')) return;
    try {
      await api.deleteCategory(id);
      await load();
    } catch (error) {
      setStatus({ error: error.message, success: '' });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Categorías"
        description="Define las pestañas que aparecen en la pantalla principal de la TV."
      />

      <StatusMessage {...status} />

      <section className="panel">
        <h2>{editingId ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label>
            Orden
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
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
              {editingId ? 'Guardar cambios' : 'Crear categoría'}
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Nombre</th>
                  <th>Contenidos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.sortOrder}</td>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </td>
                    <td>{item.streamCount}</td>
                    <td>
                      <span className={`badge ${item.isActive ? 'active' : ''}`}>
                        {item.isActive ? 'Activa' : 'Oculta'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button className="ghost" onClick={() => edit(item)}>Editar</button>
                      <button className="danger" onClick={() => remove(item.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
