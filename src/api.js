const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const hasJson = response.headers.get('content-type')?.includes('application/json');
  const payload = hasJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || `Error HTTP ${response.status}`);
  }

  return payload?.data ?? payload;
}

export const api = {
  listCategories: () => request('/categories'),
  createCategory: (data) =>
    request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    request(`/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) =>
    request(`/categories/${id}`, { method: 'DELETE' }),

  listStreams: () => request('/streams'),
  createStream: (data) =>
    request('/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateStream: (id, data) =>
    request(`/streams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteStream: (id) =>
    request(`/streams/${id}`, { method: 'DELETE' }),
  testStream: (url, streamType) =>
    request('/streams/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, streamType }),
    }),

  uploadThumbnail: async (file) => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return request('/uploads/thumbnail', {
      method: 'POST',
      body: formData,
    });
  },
};
