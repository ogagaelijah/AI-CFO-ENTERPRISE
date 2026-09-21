// frontend/src/services/api.js
// v4.0.0-prod — Bearer auth support alongside cookies. Fixes cross-origin
//               cookie blocks on staging/production. Token stored in
//               localStorage; attached as Authorization header on every
//               request. 401 clears token.

import axios from 'axios';
import { reportError, reportWarning } from './telemetry';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'aicfo.auth.token';

// ── Token storage helpers (safe against disabled localStorage / private mode)
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* noop */
  }
};

// ── Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,          // still send cookies when the browser allows
  headers: { 'Content-Type': 'application/json' },
});

// ── 401 handler (set from AuthContext to avoid circular import)
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// ── Request ID for log correlation
const makeRequestId = () =>
  `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ── Request interceptor: attach Bearer token when present
api.interceptors.request.use(
  (config) => {
    config.headers['X-Request-Id'] =
      config.headers['X-Request-Id'] || makeRequestId();

    // Do not overwrite an explicit Authorization header
    if (!config.headers.Authorization) {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    const status = response?.status;
    const url = config?.url;
    const method = config?.method?.toUpperCase();

    // Cancellations are not errors
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      return Promise.reject(error);
    }

    // 401 — session expired / invalid token
    if (status === 401) {
      const isAuthProbe =
        url?.includes('/auth/me') ||
        url?.includes('/auth/login') ||
        url?.includes('/auth/register');

      // On a genuine 401 from a protected endpoint, wipe the stored token
      // so we don't keep sending a dead bearer.
      if (!isAuthProbe) {
        clearStoredToken();
        if (typeof onUnauthorized === 'function') {
          try {
            onUnauthorized();
          } catch (e) {
            reportError(e, { scope: 'api.onUnauthorized' });
          }
        }
      }
      return Promise.reject(error);
    }

    // 403 — plan gate. Caller decides what to show.
    if (status === 403) {
      reportWarning('API 403 Forbidden', { url, method });
      return Promise.reject(error);
    }

    // 5xx — server-side problem
    if (status >= 500) {
      reportError(error, { scope: 'api.5xx', url, method, status });
      return Promise.reject(error);
    }

    // Network errors
    if (!response) {
      reportError(error, { scope: 'api.network', url, method });
      return Promise.reject(error);
    }

    // Other 4xx
    if (status >= 400) {
      reportWarning(`API ${status}`, { url, method });
    }

    return Promise.reject(error);
  }
);

// ── Cross-tab sync: when one tab logs out, all tabs drop the token.
// The AuthContext listens to this and clears in-memory user state.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_STORAGE_KEY && event.newValue === null) {
      if (typeof onUnauthorized === 'function') {
        try {
          onUnauthorized();
        } catch (e) {
          reportError(e, { scope: 'api.storageSync' });
        }
      }
    }
  });
}

// ── Typed API groups
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

export const businessApi = {
  get: () => api.get('/business'),
  update: (data) => api.put('/business', data),
};

export const dashboardApi = {
  getSummary: (signal) => api.get('/dashboard/summary', { signal }),
};

export const subscriptionApi = {
  getPlans: () => api.get('/subscription/plans'),
  getCurrent: () => api.get('/subscription/current'),
  cancel: (reason = '') => api.post('/subscription/cancel', { reason }),
};

export default api;