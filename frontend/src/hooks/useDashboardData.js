// frontend/src/hooks/useDashboardData.js
// v2.0.0-prod — Plan-aware fetch with retry + abort + read-only bail.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from './usePlan';
import { dashboardApi } from '../services/api';
import { reportError } from '../services/telemetry';

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
  const { isReadOnly } = usePlan();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const fetchDashboard = useCallback(
    async (isRetry = false) => {
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      // ── Guard: no business or read-only → do not hit the network
      if (!user?.businessId || isReadOnly) {
        if (mountedRef.current) {
          setData(EMPTY_DASHBOARD);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      try {
        if (mountedRef.current) {
          setIsLoading(true);
          setError(null);
        }

        const response = await dashboardApi.getSummary(controller.signal);
        if (!mountedRef.current) return;

        if (response.data?.success) {
          setData(response.data.data || EMPTY_DASHBOARD);
        } else {
          setData(EMPTY_DASHBOARD);
          setError('Failed to load dashboard');
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return;
        if (!mountedRef.current) return;

        const status = err.response?.status;

        // 403 = plan gate; silent empty state
        if (status === 403) {
          setData(EMPTY_DASHBOARD);
          setError(null);
          return;
        }

        const shouldRetry =
          !isRetry && (!err.response || (status && status >= 500));

        if (shouldRetry) {
          retryTimerRef.current = setTimeout(() => {
            if (mountedRef.current) fetchDashboard(true);
          }, RETRY_DELAY_MS);
          return;
        }

        reportError(err, { scope: 'useDashboardData' });
        setError(err.message || 'Failed to load dashboard');
        setData(EMPTY_DASHBOARD);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    },
    [user?.businessId, isReadOnly]
  );

  useEffect(() => {
    fetchDashboard();
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

export default useDashboardData;