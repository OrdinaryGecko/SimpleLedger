import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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

export const authApi = {
  signup: (email, password) => api.post('/auth/signup', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const configApi = {
  get: () => api.get('/config'),
};

export const ordersApi = {
  list: (filters = {}) => api.get('/orders', { params: filters }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

export const paymentsApi = {
  create: (orderId, data) => api.post(`/orders/${orderId}/payments`, data),
};

export const auditLogsApi = {
  list: (orderId) => api.get(`/orders/${orderId}/audit_logs`),
};

export const exportsApi = {
  downloadCsv: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/v1/orders/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${filters.from || 'all'}_${filters.to || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default api;
