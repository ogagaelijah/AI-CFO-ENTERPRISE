// frontend/src/pages/Risk.jsx
// SSOT v2.0.1-prod — dark theme back button

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import riskService from '../services/risk/riskService';

import RiskHeader from '../components/risk/RiskHeader';
import RiskSummaryCards from '../components/risk/RiskSummaryCards';
import RiskDomainGrid from '../components/risk/RiskDomainGrid';
import RiskRecommendations from '../components/risk/RiskRecommendations';
import RiskProjectedValues from '../components/risk/RiskProjectedValues';
import RiskLoading from '../components/risk/RiskLoading';
import RiskError from '../components/risk/RiskError';

const DEFAULT_HORIZON = '30D';

const BackButton = ({ onBack }) => (
  <button
    type="button"
    onClick={onBack}
    className="flex-shrink-0 p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
    aria-label="Go back"
  >
    <ArrowLeft className="w-5 h-5 text-slate-300" />
  </button>
);

export default function RiskPage() {
  const navigate = useNavigate();
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [horizons, setHorizons] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  const loadHorizons = useCallback(async () => {
    try {
      const list = await riskService.getHorizons();
      setHorizons(list);
    } catch (err) {
      console.warn('Failed to load horizons', err);
    }
  }, []);

  const loadRisk = useCallback(async (selectedHorizon = horizon) => {
    setLoading(true);
    setError(null);
    try {
      const result = await riskService.assess({ horizon: selectedHorizon });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load risk assessment');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    loadHorizons();
  }, [loadHorizons]);

  useEffect(() => {
    loadRisk(horizon);
  }, [horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHorizonChange = (newHorizon) => {
    setHorizon(newHorizon);
  };

  const handleRefresh = () => {
    loadRisk(horizon);
  };

  if (loading && !data) {
    return (
      <div className="risk-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Risk</h1>
        </div>
        <RiskLoading />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="risk-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Risk</h1>
        </div>
        <RiskError message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className="risk-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onBack={handleBack} />
      </div>

      <RiskHeader
        horizon={horizon}
        horizons={horizons}
        onHorizonChange={handleHorizonChange}
        onRefresh={handleRefresh}
        loading={loading}
        generatedAt={data?.generatedAt}
      />

      {data && (
        <>
          <RiskSummaryCards summary={data.summary} executive={data.executiveSummary} />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RiskDomainGrid risks={data.risks} />
            </div>
            <div className="space-y-6">
              <RiskProjectedValues projected={data.projected} />
              <RiskRecommendations recommendations={data.recommendations} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}