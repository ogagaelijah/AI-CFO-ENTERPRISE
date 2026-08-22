// frontend/src/services/api.js
import axios from 'axios';

// Base API URL - change for production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: sends cookies with requests
});

// Request interceptor - add token to headers if needed
api.interceptors.request.use(
  (config) => {
    // You can add token from cookie if needed
    // but with HttpOnly cookies, the browser sends it automatically
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Dashboard endpoints
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenue: (period) => api.get(`/dashboard/revenue?period=${period}`),
};

// Reports endpoints
export const reportsApi = {
  getDaily: (date) => api.get(`/reports/daily?date=${date}`),
  getWeekly: (date) => api.get(`/reports/weekly?date=${date}`),
  getMonthly: (date) => api.get(`/reports/monthly?date=${date}`),
  getYearly: (date) => api.get(`/reports/yearly?date=${date}`),
  getExecutive: () => api.get('/reports/executive'),
};

// Sales endpoints
export const salesApi = {
  create: (data) => api.post('/sales', data),
  getAll: () => api.get('/sales'),
  getToday: () => api.get('/sales/today'),
};

// Inventory endpoints
export const inventoryApi = {
  create: (data) => api.post('/inventory', data),
  getAll: () => api.get('/inventory'),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// Debtors endpoints
export const debtorsApi = {
  getAll: () => api.get('/debtors'),
  create: (data) => api.post('/debtors', data),
  recordPayment: (id, data) => api.post(`/debtors/${id}/payment`, data),
};

export default api;