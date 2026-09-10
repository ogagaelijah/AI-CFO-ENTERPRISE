// frontend/src/hooks/useDashboardData.js
// Production-grade dashboard hook with retry logic

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const EMPTY_DASHBOARD = {
  kpis: {
    revenue: { today: 0, month: 0, growth: 0, formatted: '₦0' },
    profit: { month: 0, margin: 0, formatted: '₦0' },
    cash: { current: 0, flow: 0, formatted: '₦0' },
    receivables: { total: 0, overdue: 0, formatted: '₦0' },
    payables: { total: 0, overdue: 0, formatted: '₦0' },
    inventory: { total: 0, lowStock: 0, formatted: '₦0' },
    expenses: { today: 0, month: 0, formatted: '₦0' },
    sales: { today: 0, month: 0, growth: 0 },
  },
  healthScore: { score: 0, status: 'NEUTRAL', label: 'No Data' },
  topRisks: [],
  topDecisions: [],
  forecast: {
    revenue: { forecast: 0, confidence: 0 },
    profit: { forecast: 0, confidence: 0 },
    cashFlow: { forecast: 0, confidence: 0 },
  },
  period: null,
  metadata: null,
};

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchDashboard = useCallback(async (isRetry = false) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    if (!user?.businessId) {
      setData(EMPTY_DASHBOARD);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/dashboard/summary', {
        signal: controller.signal,
      });

      if (response.data?.success) {
        setData(response.data.data || EMPTY_DASHBOARD);
      } else {
        setData(EMPTY_DASHBOARD);
        setError('Failed to load dashboard');
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      // Retry on network errors
      if (!isRetry && (!err.response || err.response.status >= 500)) {
        console.log('Retrying dashboard fetch...');
        setTimeout(() => fetchDashboard(true), RETRY_DELAY_MS);
        return;
      }

      setError(err.message || 'Failed to load dashboard');
      setData(EMPTY_DASHBOARD);
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId]);

  useEffect(() => {
    fetchDashboard();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchDashboard]);

  return {
    data: data || EMPTY_DASHBOARD,
    kpis: data?.kpis || EMPTY_DASHBOARD.kpis,
    healthScore: data?.healthScore || EMPTY_DASHBOARD.healthScore,
    topRisks: data?.topRisks || [],
    topDecisions: data?.topDecisions || [],
    forecast: data?.forecast || EMPTY_DASHBOARD.forecast,
    isLoading,
    error,
    refresh: () => fetchDashboard(),
  };
};