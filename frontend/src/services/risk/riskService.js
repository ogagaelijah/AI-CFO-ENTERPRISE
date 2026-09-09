// frontend/src/services/risk/riskService.js
// SSOT v2.0.0-prod | Pure consumer of /api/risk

import api from '../api'; // your existing axios instance (already has baseURL: '/api')
import {
  mapRiskPackage,
  mapQuickRisk,
  mapHorizons,
} from './mappers';

const BASE = '/risk';   // ← changed from '/api/risk'

export const riskService = {
  /**
   * Full risk assessment
   */
  async assess({ horizon = '30D', whatIfChanges = null } = {}) {
    const response = await api.post(`${BASE}/assess`, {
      horizon,
      whatIfChanges,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Risk assessment failed');
    }

    return mapRiskPackage(response.data.data);
  },

  /**
   * Lightweight summary
   */
  async quick({ horizon = '30D' } = {}) {
    const response = await api.post(`${BASE}/quick`, { horizon });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Quick risk failed');
    }

    return mapQuickRisk(response.data.data);
  },

  /**
   * Available horizons
   */
  async getHorizons() {
    const response = await api.get(`${BASE}/horizons`);

    if (!response.data?.success) {
      throw new Error('Failed to load horizons');
    }

    return mapHorizons(response.data);
  },

  /**
   * Health check
   */
  async healthCheck() {
    const response = await api.post(`${BASE}/health-check`);
    return response.data;
  },
};

export default riskService;