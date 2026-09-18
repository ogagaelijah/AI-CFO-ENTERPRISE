/**
 * Forecast Page
 * Main page for forecast dashboard
 * Dark mode - Consistent with Analytics theme
 * SSOT v5.8.0 – Current values from Analytics, projections only for horizon
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import forecastService from '../services/forecast/forecastService';
import ExecutiveSummaryCard from '../components/forecast/ExecutiveSummaryCard';
import HorizonSelector from '../components/forecast/HorizonSelector';
import ForecastLoading from '../components/forecast/ForecastLoading';
import ForecastError from '../components/forecast/ForecastError';
import ForecastEmpty from '../components/forecast/ForecastEmpty';
import ForecastGrid from '../components/forecast/ForecastGrid';
import ScenarioComparison from '../components/forecast/ScenarioComparison';
import ConfidenceIndicator from '../components/forecast/ConfidenceIndicator';
import RiskList from '../components/forecast/RiskList';
import WhatIfAnalyzer from '../components/forecast/WhatIfAnalyzer';

const DEFAULT_HORIZON = '30D';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const Forecast = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);

  const fetchForecast = useCallback(async (isRetry = false, customParams = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = {
        horizon,
        businessId: user?.businessId,
        ...customParams,
      };

      const response = await forecastService.getForecast(params);

      if (response.success) {
        setData(response.data);
        setRetryCount(0);
      } else {
        setError(response.message || 'Failed to load forecast data');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }

      if (retryCount < MAX_RETRIES && !isRetry) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        setRetryCount((prev) => prev + 1);

        setTimeout(() => {
          fetchForecast(true, customParams);
        }, delay);
        return;
      }

      setError(err.message || 'Failed to load forecast data');
      console.error('Forecast fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [horizon, user?.businessId, retryCount]);

  const handleHorizonChange = useCallback((newHorizon) => {
    if (newHorizon !== horizon) {
      setHorizon(newHorizon);
      setRetryCount(0);
    }
  }, [horizon]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    fetchForecast();
  }, [fetchForecast]);

  const handleRefresh = useCallback(() => {
    setData(null);
    setRetryCount(0);
    fetchForecast();
  }, [fetchForecast]);

  const handleWhatIfAnalyze = useCallback((changes) => {
    fetchForecast(false, { whatIfChanges: changes });
  }, [fetchForecast]);

  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    fetchForecast();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchForecast]);

  // ── Data readiness ────────────────────────────────────────────────
  const hasData = useMemo(() => {
    if (!data) return false;

    if (data.current && (data.current.revenue > 0 || data.current.profit !== 0 || data.current.cashFlow !== 0)) {
      return true;
    }

    if (data.baseForecast) {
      const hasProjection = Object.values(data.baseForecast).some(
        (item) => item?.available || (item?.forecast != null && Number(item.forecast) !== 0)
      );
      if (hasProjection) return true;
    }

    if (data.available && data.baseForecast) return true;

    return false;
  }, [data]);

  // ── Prefer the already-mapped executive from the service ──────────
  const executiveData = useMemo(() => {
    if (!data) return null;

    // 1. Best path – mapper already built the correct shape
    if (data.executive?.keyMetrics) {
      return data.executive;
    }

    // 2. Safety fallback (in case mapper is missing for some reason)
    if (data.current) {
      const c = data.current;
      const s = data.summary || {};
      const revenue = Number(c.revenue) || 0;
      const profit = Number(c.profit) || 0;
      const cashFlow = Number(c.cashFlow) || 0;

      const status = s.status || 'NEUTRAL';
      const riskSummary = s.risks || { overallSeverity: 'LOW', total: 0 };

      let narrative = `Current period: Revenue ₦${revenue.toLocaleString()}, Profit ₦${profit.toLocaleString()}, Cash Flow ₦${cashFlow.toLocaleString()}.`;
      if (status === 'CRITICAL') {
        narrative = `Critical risk detected. ${narrative}`;
      } else if (status === 'WARNING') {
        narrative = `Caution advised. ${narrative}`;
      }

      return {
        keyMetrics: {
          revenue,
          profit,
          cashFlow,
          expenses: Number(c.expenses) || 0,
          revenueConfidence: s.revenue?.confidence ?? 65,
          profitConfidence: s.profit?.confidence ?? 65,
          cashConfidence: s.cashFlow?.confidence ?? 65,
        },
        riskSummary: {
          overallSeverity: riskSummary.overallSeverity || 'LOW',
          total: riskSummary.total || 0,
          critical: riskSummary.critical || 0,
          high: riskSummary.high || 0,
        },
        status,
        executiveSummary: { narrative },
      };
    }

    return null;
  }, [data]);

  const generatedAt = data?.generatedAt || data?.metadata?.generatedAt || null;

  const BackButton = () => (
    <button
      type="button"
      onClick={handleBack}
      className="flex-shrink-0 p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5 text-slate-300" />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
        </div>
        <ForecastLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
        </div>
        <ForecastError
          message={error}
          onRetry={handleRetry}
          retryCount={retryCount}
          maxRetries={MAX_RETRIES}
          loading={loading}
        />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
              <p className="text-slate-400 mt-1">
                Forward-looking projections powered by Analytics SSOT
              </p>
            </div>
          </div>
          <HorizonSelector
            horizon={horizon}
            onHorizonChange={handleHorizonChange}
            disabled={loading}
          />
        </div>

        <ForecastEmpty
          message="No forecast data available"
          description="Continue recording sales, purchases, and expenses to enable forecasting. The system needs at least 7 data points (30 days) to generate reliable forecasts."
          onRefresh={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
            <p className="text-slate-400 mt-1">
              Forward-looking projections powered by Analytics SSOT
            </p>
            {generatedAt && (
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-300 rounded-lg hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            aria-label="Refresh forecast data"
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <HorizonSelector
            horizon={horizon}
            onHorizonChange={handleHorizonChange}
            disabled={loading}
          />
        </div>
      </div>

      {/* Top cards = CURRENT SSOT values */}
      <div className="mb-8">
        <ExecutiveSummaryCard data={executiveData} loading={loading} />
      </div>

      {/* Metric cards = PROJECTED values for the selected horizon */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Forecast Metrics</h2>
        <ForecastGrid forecasts={data?.baseForecast} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ScenarioComparison scenarios={data?.scenarios} loading={loading} />
        <ConfidenceIndicator confidence={data?.confidence} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WhatIfAnalyzer
          whatIf={data?.whatIf}
          onAnalyze={handleWhatIfAnalyze}
          loading={loading}
        />
        <RiskList risks={data?.risks} loading={loading} />
      </div>
    </div>
  );
};

export default Forecast;