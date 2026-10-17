// frontend/src/services/reportService.js
// v1.1.0-prod — Adds inventory movement and valuation endpoints.

import api from './api';

const toDateStr = (date) => date || new Date().toISOString().split('T')[0];

const buildRangeParams = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return params.toString();
};

export const reportApi = {
  // ... existing methods ...
  getDaily: (date) => api.get(`/reports/daily?date=${toDateStr(date)}`),
  getWeekly: (date) => api.get(`/reports/weekly?date=${toDateStr(date)}`),
  getMonthly: (date) => api.get(`/reports/monthly?date=${toDateStr(date)}`),
  getYearly: (date) => api.get(`/reports/yearly?date=${toDateStr(date)}`),
  getExecutive: (startDate, endDate) => api.get(`/reports/executive?${buildRangeParams(startDate, endDate)}`),
  getPL: (startDate, endDate) => api.get(`/reports/pl?${buildRangeParams(startDate, endDate)}`),
  getCashFlow: (startDate, endDate) => api.get(`/reports/cashflow?${buildRangeParams(startDate, endDate)}`),
  getBalanceSheet: (asAtDate) => api.get(`/reports/balance-sheet?asAtDate=${toDateStr(asAtDate)}`),

  // ★ NEW: Inventory Reports
  getInventoryValuation: (asAtDate) => 
    api.get(`/reports/inventory?asAtDate=${toDateStr(asAtDate)}&includeDetails=true`),
    
  getInventoryMovement: (startDate, endDate, page = 1, limit = 50) => 
    api.get(`/reports/inventory-movement?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`),
};

export default reportApi;