import { useState, useEffect, useCallback } from 'react';
import analyticsService from '../services/analytics/analyticsService';
import AnalyticsHeader from '../components/analytics/AnalyticsHeader';
import PeriodSelector from '../components/analytics/PeriodSelector';
import ExecutiveSummaryCard from '../components/analytics/ExecutiveSummaryCard';
import KpiGrid from '../components/analytics/KpiGrid';
import RatioSection from '../components/analytics/RatioSection';
import TrendCharts from '../components/analytics/TrendCharts';
import PerformanceScore from '../components/analytics/PerformanceScore';
import HealthScore from '../components/analytics/HealthScore';
import ConcentrationRisk from '../components/analytics/ConcentrationRisk';
import SignalsList from '../components/analytics/SignalsList';
import EmptyState from '../components/analytics/EmptyState';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('monthly');

  const fetchAnalytics = useCallback(async (selectedPeriod) => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyticsService.getAnalytics({ period: selectedPeriod });
      setData(result);
    } catch (err) {
      console.error('[Analytics] fetch error:', err);
      setError(err?.message || 'Analytics data not found.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const handleRetry = () => {
    fetchAnalytics(period);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <AnalyticsHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <AnalyticsHeader />
          <PeriodSelector value={period} onChange={handlePeriodChange} />
        </div>
        <EmptyState
          title="Unable to Load Analytics"
          message={error || 'Analytics data not found.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <AnalyticsHeader generatedAt={data.meta?.generatedAt} />
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {/* Executive Summary */}
      <div className="mb-8">
        <ExecutiveSummaryCard executive={data.executive} />
      </div>

      {/* KPIs */}
      <div className="mb-8">
        <KpiGrid kpis={data.kpis} />
      </div>

      {/* Performance + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PerformanceScore performance={data.performance} />
        <HealthScore health={data.health} />
      </div>

      {/* Signals */}
      <div className="mb-8">
        <SignalsList signals={data.signals} />
      </div>

      {/* Trends */}
      <div className="mb-8">
        <TrendCharts trends={data.trends} />
      </div>

      {/* Ratios */}
      <div className="mb-8">
        <RatioSection ratios={data.ratios} />
      </div>

      {/* Concentration */}
      <div className="mb-8">
        <ConcentrationRisk concentration={data.concentration} />
      </div>
    </div>
  );
}