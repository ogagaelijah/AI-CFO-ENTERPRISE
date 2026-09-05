// frontend/src/services/reportService.js
import api from './api';

/**
 * Report API Service
 * All endpoints return { success, data, message } from backend
 */

const toDateStr = (date) => date || new Date().toISOString().split('T')[0];

const buildRangeParams = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return params.toString();
};

export const reportApi = {
  // =============================================
  // PERIOD-BASED REPORTS (with date parameters)
  // =============================================

  /**
   * Get Daily Report
   * @param {string} [date] - ISO date string (YYYY-MM-DD). Defaults to today.
   * @returns {Promise} Daily report data
   */
  getDaily: (date) => api.get(`/reports/daily?date=${toDateStr(date)}`),

  /**
   * Get Weekly Report
   * @param {string} [date] - ISO date string (YYYY-MM-DD) - any day in the week. Defaults to today.
   * @returns {Promise} Weekly report data
   */
  getWeekly: (date) => api.get(`/reports/weekly?date=${toDateStr(date)}`),

  /**
   * Get Monthly Report
   * @param {string} [date] - ISO date string (YYYY-MM-DD) - any day in the month. Defaults to today.
   * @returns {Promise} Monthly report data
   */
  getMonthly: (date) => api.get(`/reports/monthly?date=${toDateStr(date)}`),

  /**
   * Get Yearly Report
   * @param {string} [date] - ISO date string (YYYY-MM-DD) - any day in the year. Defaults to today.
   * @returns {Promise} Yearly report data
   */
  getYearly: (date) => api.get(`/reports/yearly?date=${toDateStr(date)}`),

  // =============================================
  // CUSTOM PERIOD REPORTS (startDate + endDate)
  // =============================================

  /**
   * Get Executive Report
   * @param {string} [startDate] - ISO date string (YYYY-MM-DD)
   * @param {string} [endDate] - ISO date string (YYYY-MM-DD)
   * @returns {Promise} Executive report data
   */
  getExecutive: (startDate, endDate) =>
    api.get(`/reports/executive?${buildRangeParams(startDate, endDate)}`),

  /**
   * Get Profit & Loss Report
   * @param {string} [startDate] - ISO date string (YYYY-MM-DD)
   * @param {string} [endDate] - ISO date string (YYYY-MM-DD)
   * @returns {Promise} P&L report data
   */
  getPL: (startDate, endDate) =>
    api.get(`/reports/pl?${buildRangeParams(startDate, endDate)}`),

  /**
   * Get Cash Flow Report
   * @param {string} [startDate] - ISO date string (YYYY-MM-DD)
   * @param {string} [endDate] - ISO date string (YYYY-MM-DD)
   * @returns {Promise} Cash Flow report data
   */
  getCashFlow: (startDate, endDate) =>
    api.get(`/reports/cashflow?${buildRangeParams(startDate, endDate)}`),

  /**
   * Get Balance Sheet Report
   * @param {string} [asAtDate] - ISO date string (YYYY-MM-DD) - the date to snapshot. Defaults to today.
   * @returns {Promise} Balance Sheet report data
   */
  getBalanceSheet: (asAtDate) =>
    api.get(`/reports/balance-sheet?asAtDate=${toDateStr(asAtDate)}`),
};

export default reportApi;