import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
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

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        </div>
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
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
          </div>
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
            {data.meta?.generatedAt && (
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {new Date(data.meta.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      <div className="mb-8">
        <ExecutiveSummaryCard executive={data.executive} />
      </div>

      <div className="mb-8">
        <KpiGrid kpis={data.kpis} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PerformanceScore performance={data.performance} />
        <HealthScore health={data.health} />
      </div>

      <div className="mb-8">
        <SignalsList signals={data.signals} />
      </div>

      <div className="mb-8">
        <TrendCharts trends={data.trends} />
      </div>

      <div className="mb-8">
        <RatioSection ratios={data.ratios} />
      </div>

      <div className="mb-8">
        <ConcentrationRisk concentration={data.concentration} />
      </div>
    </div>
  );
}