/**
 * Forecast Service - Handles all forecast API calls
 * SSOT: All forecast API communication
 */

import api from '../api';
import { mapForecastResponse } from './mappers';

const FORECAST_BASE = '/forecast';

export const getForecast = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/generate`, params);
    
    // Map the response data
    const mappedData = mapForecastResponse(response.data);
    
    return {
      success: true,
      data: mappedData,
      horizon: response.data?.horizon || params.horizon || '30D',
      timestamp: response.data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

export const getRevenueForecast = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/revenue`, params);
    return {
      success: true,
      data: response.data?.data || null,
      horizon: response.data?.horizon || params.horizon || '30D',
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

export const getCashFlowForecast = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/cashflow`, params);
    return {
      success: true,
      data: response.data?.data || null,
      horizon: response.data?.horizon || params.horizon || '30D',
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

export const getInventoryForecast = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/inventory`, params);
    return {
      success: true,
      data: response.data?.data || null,
      horizon: response.data?.horizon || params.horizon || '30D',
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

export const getScenarios = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/scenarios`, params);
    return {
      success: true,
      data: response.data?.data || null,
      horizon: response.data?.horizon || params.horizon || '30D',
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

export const getWhatIf = async (params = {}) => {
  try {
    const response = await api.post(`${FORECAST_BASE}/whatif`, params);
    return {
      success: true,
      data: response.data?.data || null,
      horizon: response.data?.horizon || params.horizon || '30D',
    };
  } catch (error) {
    throw handleForecastError(error);
  }
};

/**
 * Error handler for forecast API calls
 */
const handleForecastError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || 'Forecast service error';
    
    if (status === 401) return new Error('Please log in to view forecasts.');
    if (status === 403) return new Error('You do not have permission to view forecasts.');
    if (status === 404) return new Error('Forecast data not found.');
    if (status === 429) return new Error('Too many requests. Please try again later.');
    if (status >= 500) return new Error('Forecast service is temporarily unavailable.');
    
    return new Error(message);
  }
  
  if (error.request) {
    return new Error('Network error. Please check your connection.');
  }
  
  return new Error(error.message || 'An unexpected error occurred.');
};

const forecastService = {
  getForecast,
  getRevenueForecast,
  getCashFlowForecast,
  getInventoryForecast,
  getScenarios,
  getWhatIf,
};

export default forecastService;