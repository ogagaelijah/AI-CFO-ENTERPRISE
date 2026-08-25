// frontend/src/services/reportService.js
import api from './api';

export const reportApi = {
  // Get daily report
  getDaily: (date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return api.get(`/reports/daily?date=${dateStr}`);
  },

  // Get weekly report
  getWeekly: (date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return api.get(`/reports/weekly?date=${dateStr}`);
  },

  // Get monthly report
  getMonthly: (date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return api.get(`/reports/monthly?date=${dateStr}`);
  },

  // Get yearly report
  getYearly: (date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return api.get(`/reports/yearly?date=${dateStr}`);
  },

  // Get executive summary
  getExecutive: () => {
    return api.get('/reports/executive');
  },
};