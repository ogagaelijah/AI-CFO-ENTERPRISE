/**
 * Forecast Page
 * Main page for forecast dashboard
 * Dark mode - Consistent with Analytics theme
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [retryCount, setRetryCount] = useState(0);
  const [whatIfChanges, setWhatIfChanges] = useState([]);
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
    setWhatIfChanges(changes);
    fetchForecast(false, { whatIfChanges: changes });
  }, [fetchForecast]);

  useEffect(() => {
    fetchForecast();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchForecast]);

  const hasData = data?.available && data?.baseForecast && 
    Object.values(data.baseForecast).some(item => item?.available || item?.forecast > 0);

  const executiveData = data?.executive || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <ForecastLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
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
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
            <p className="text-slate-400 mt-1">
              Forward-looking projections powered by Analytics SSOT
            </p>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Forecast</h1>
          <p className="text-slate-400 mt-1">
            Forward-looking projections powered by Analytics SSOT
          </p>
          {data?.metadata?.generatedAt && (
            <p className="text-xs text-slate-500 mt-1">
              Last updated: {new Date(data.metadata.generatedAt).toLocaleString()}
            </p>
          )}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <HorizonSelector 
            horizon={horizon} 
            onHorizonChange={handleHorizonChange} 
            disabled={loading}
          />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mb-8">
        <ExecutiveSummaryCard data={executiveData} loading={loading} />
      </div>

      {/* Forecast Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Forecast Metrics</h2>
        <ForecastGrid forecasts={data?.baseForecast} loading={loading} />
      </div>

      {/* Scenarios + Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ScenarioComparison scenarios={data?.scenarios} loading={loading} />
        <ConfidenceIndicator confidence={data?.confidence} loading={loading} />
      </div>

      {/* What-If + Risks */}
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