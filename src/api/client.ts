import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, displayName: string) =>
    api.post('/auth/register', { email, password, displayName }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: Record<string, string>) => api.patch('/auth/me', data),
  getCanvaAuthUrl: () => api.get('/auth/canva/connect'),
  disconnectCanva: () => api.post('/auth/canva/disconnect'),
};

// ─── Designs ──────────────────────────────────────────

export const designsApi = {
  list: (params?: Record<string, string>) => api.get('/designs', { params }),
  create: (data: Record<string, unknown>) => api.post('/designs', data),
  get: (id: string) => api.get(`/designs/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/designs/${id}`, data),
  delete: (id: string) => api.delete(`/designs/${id}`),
  sync: () => api.post('/designs/sync'),
  getEditUrl: (id: string) => api.get(`/designs/${id}/edit-url`),
};

// ─── Templates ──────────────────────────────────────────

export const templatesApi = {
  list: (params?: Record<string, string>) => api.get('/templates', { params }),
  create: (data: Record<string, unknown>) => api.post('/templates', data),
  get: (id: string) => api.get(`/templates/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  syncBrand: () => api.post('/templates/sync-brand'),
  autofill: (id: string, data: Record<string, unknown>) => api.post(`/templates/${id}/autofill`, data),
  getCategories: () => api.get('/templates/meta/categories'),
};

// ─── Assets ──────────────────────────────────────────

export const assetsApi = {
  list: (params?: Record<string, string>) => api.get('/assets', { params }),
  upload: (formData: FormData) => api.post('/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadUrl: (data: Record<string, unknown>) => api.post('/assets/upload-url', data),
  get: (id: string) => api.get(`/assets/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/assets/${id}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
  getStats: () => api.get('/assets/meta/stats'),
};

// ─── Folders ──────────────────────────────────────────

export const foldersApi = {
  list: (params?: Record<string, string>) => api.get('/folders', { params }),
  create: (data: Record<string, unknown>) => api.post('/folders', data),
  get: (id: string) => api.get(`/folders/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`),
  getTree: () => api.get('/folders/meta/tree'),
};

// ─── Exports ──────────────────────────────────────────

export const exportsApi = {
  list: (params?: Record<string, string>) => api.get('/exports', { params }),
  create: (data: Record<string, unknown>) => api.post('/exports', data),
  getStatus: (id: string) => api.get(`/exports/${id}/status`),
  delete: (id: string) => api.delete(`/exports/${id}`),
  getFormats: (designId: string) => api.get(`/exports/formats/${designId}`),
};

// ─── Comments ──────────────────────────────────────────

export const commentsApi = {
  listByDesign: (designId: string) => api.get(`/comments/design/${designId}`),
  create: (data: Record<string, unknown>) => api.post('/comments', data),
  reply: (id: string, message: string) => api.post(`/comments/${id}/reply`, { message }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/comments/${id}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`),
};

// ─── Settings ──────────────────────────────────────────

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, Record<string, string>>) => api.put('/settings', data),
  getAppConfig: () => api.get('/settings/app'),
  updateAppConfig: (data: Record<string, Record<string, string>>) => api.put('/settings/app', data),
  getStats: () => api.get('/settings/stats'),
};

export default api;
