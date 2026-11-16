// mobile/src/services/api.js
// v1.3.0 — Fixes API domain typo (aicfotechnologies.com), adds EXPO_PUBLIC_API_URL override.
// v1.2.0 — Adds authApi (Google endpoints) alongside partnerApi.
// v1.1.0 — Adds partnerApi endpoints.

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.aicfotechnologies.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // Don't overwrite an explicit Authorization header (loginWithToken relies on this)
    if (!config.headers.Authorization) {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API abstraction (for Google Login)
export const authApi = {
  googleAuth: (credential) => api.post('/auth/google', { credential }),
  googleComplete: (data) => api.post('/auth/google/complete', data),
};

// Partner API abstraction
export const partnerApi = {
  apply: () => api.post('/partners/apply'),
  getDashboard: () => api.get('/partners/dashboard'),
  withdraw: (amount) => api.post('/partners/withdraw', { amount }),
};

export default api;