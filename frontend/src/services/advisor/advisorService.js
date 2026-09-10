import api from '../api';
import { mapAdvisorPackage, mapHorizons } from './mappers';

const BASE = '/advisor';

export const advisorService = {
  async generate({ horizon = '30D', whatIfChanges = null } = {}) {
    const response = await api.post(`${BASE}/generate`, { horizon, whatIfChanges });
    if (!response.data?.success) throw new Error(response.data?.message || 'Advisor failed');
    return mapAdvisorPackage(response.data.data);
  },
  async getHorizons() {
    const response = await api.get(`${BASE}/horizons`);
    if (!response.data?.success) throw new Error('Failed to load horizons');
    return mapHorizons(response.data);
  },
  async healthCheck() {
    return (await api.post(`${BASE}/health-check`)).data;
  },
};

export default advisorService;