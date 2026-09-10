// frontend/src/services/decision/decisionService.js
// SSOT v2.0.0-prod | Pure consumer of /api/decision

import api from '../api';
import {
  mapDecisionPackage,
  mapHorizons,
} from './mappers';

const BASE = '/decision';

export const decisionService = {
  async generate({ horizon = '30D', whatIfChanges = null, limit = 30 } = {}) {
    const response = await api.post(`${BASE}/generate`, {
      horizon,
      whatIfChanges,
      limit,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Decision generation failed');
    }

    return mapDecisionPackage(response.data.data);
  },

  async getHorizons() {
    const response = await api.get(`${BASE}/horizons`);

    if (!response.data?.success) {
      throw new Error('Failed to load horizons');
    }

    return mapHorizons(response.data);
  },

  async healthCheck() {
    const response = await api.post(`${BASE}/health-check`);
    return response.data;
  },
};

export default decisionService;