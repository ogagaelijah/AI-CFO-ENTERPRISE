/**
 * Forecast Mapper Helpers
 * Shared utility functions for all forecast mappers
 */

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '₦0';
  }
  return `₦${Math.round(value).toLocaleString()}`;
};

export const formatPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${Number(value).toFixed(1)}%`;
};

export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Number(value).toLocaleString();
};

export const getConfidenceLevel = (score) => {
  const s = Number(score) || 0;
  if (s >= 80) return { label: 'Strong', color: '#16A34A', bg: '#DCFCE7' };
  if (s >= 60) return { label: 'Good', color: '#65A30D', bg: '#DCFCE7' };
  if (s >= 40) return { label: 'Moderate', color: '#CA8A04', bg: '#FEF3C7' };
  if (s >= 20) return { label: 'Low', color: '#EA580C', bg: '#FFEDD5' };
  return { label: 'Very Low', color: '#DC2626', bg: '#FEE2E2' };
};

export const getScenarioType = (type) => {
  const types = {
    'CONSERVATIVE': { label: 'Conservative', icon: '🔴', color: '#DC2626', bg: '#FEE2E2' },
    'EXPECTED': { label: 'Expected', icon: '🟡', color: '#CA8A04', bg: '#FEF3C7' },
    'OPTIMISTIC': { label: 'Optimistic', icon: '🟢', color: '#16A34A', bg: '#DCFCE7' },
  };
  return types[type] || types['EXPECTED'];
};

export const getRiskSeverity = (severity) => {
  const levels = {
    'CRITICAL': { label: 'Critical', color: '#DC2626', bg: '#FEE2E2', icon: '🚨' },
    'HIGH': { label: 'High', color: '#EA580C', bg: '#FFEDD5', icon: '⚠️' },
    'MEDIUM': { label: 'Medium', color: '#CA8A04', bg: '#FEF3C7', icon: '⚡' },
    'LOW': { label: 'Low', color: '#65A30D', bg: '#DCFCE7', icon: '✅' },
    'UNKNOWN': { label: 'Unknown', color: '#6B7280', bg: '#F3F4F6', icon: '❓' },
  };
  return levels[severity] || levels['UNKNOWN'];
};

export const getStatusColor = (status) => {
  const map = {
    'CRITICAL': '#DC2626',
    'WARNING': '#EA580C',
    'POSITIVE': '#16A34A',
    'NEUTRAL': '#6B7280',
  };
  return map[status] || '#6B7280';
};

export const getStatusEmoji = (status) => {
  const map = {
    'CRITICAL': '🚨',
    'WARNING': '⚠️',
    'POSITIVE': '✅',
    'NEUTRAL': 'ℹ️',
  };
  return map[status] || 'ℹ️';
};

export const getDataStatusInfo = (status) => {
  const statuses = {
    'EXCELLENT': { label: 'Excellent', color: '#16A34A', icon: '✅' },
    'SUFFICIENT': { label: 'Sufficient', color: '#3B82F6', icon: '📊' },
    'MINIMAL': { label: 'Minimal', color: '#CA8A04', icon: '⚠️' },
    'INSUFFICIENT': { label: 'Insufficient', color: '#DC2626', icon: '🚨' },
  };
  return statuses[status] || statuses['INSUFFICIENT'];
};