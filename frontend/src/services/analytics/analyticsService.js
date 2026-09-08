import api from '../api'; // adjust path to your axios/fetch instance
import { mapAnalyticsResponse } from './mappers';

/**
 * Analytics Service - Frontend
 * Strictly consumes the backend SSOT (AnalyticsProvider)
 */
const analyticsService = {
  /**
   * Main entry – generates complete analytics
   * Backend endpoint: POST /api/analytics/generate
   */
  async getAnalytics({ period = 'monthly', startDate = null, endDate = null } = {}) {
    try {
      const payload = { period };
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;

      const response = await api.post('/analytics/generate', payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load analytics');
      }

      // Map raw backend SSOT → clean UI model
      return mapAnalyticsResponse(response.data.data);
    } catch (error) {
      console.error('[AnalyticsService] getAnalytics error:', error);
      throw error;
    }
  },

  /**
   * Executive dashboard only
   */
  async getExecutive({ period = 'monthly' } = {}) {
    try {
      const response = await api.post('/analytics/executive', { period });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load executive analytics');
      }

      return response.data.data;
    } catch (error) {
      console.error('[AnalyticsService] getExecutive error:', error);
      throw error;
    }
  },
};

export default analyticsService;