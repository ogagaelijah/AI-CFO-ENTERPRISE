// frontend/src/pages/Decisions.jsx
// SSOT v2.0.1-prod — dark theme back button

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import decisionService from '../services/decision/decisionService';

import DecisionHeader from '../components/decision/DecisionHeader';
import DecisionSummaryCards from '../components/decision/DecisionSummaryCards';
import DecisionList from '../components/decision/DecisionList';
import DecisionRecommendations from '../components/decision/DecisionRecommendations';
import DecisionProjectedValues from '../components/decision/DecisionProjectedValues';
import DecisionLoading from '../components/decision/DecisionLoading';
import DecisionError from '../components/decision/DecisionError';

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

export default function DecisionsPage() {
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
      const list = await decisionService.getHorizons();
      setHorizons(list);
    } catch (err) {
      console.warn('Failed to load horizons', err);
    }
  }, []);

  const loadDecisions = useCallback(async (selectedHorizon = horizon) => {
    setLoading(true);
    setError(null);
    try {
      const result = await decisionService.generate({ horizon: selectedHorizon });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load decisions');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    loadHorizons();
  }, [loadHorizons]);

  useEffect(() => {
    loadDecisions(horizon);
  }, [horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHorizonChange = (newHorizon) => setHorizon(newHorizon);
  const handleRefresh = () => loadDecisions(horizon);

  if (loading && !data) {
    return (
      <div className="decision-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Decisions</h1>
        </div>
        <DecisionLoading />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="decision-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Decisions</h1>
        </div>
        <DecisionError message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className="decision-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onBack={handleBack} />
      </div>

      <DecisionHeader
        horizon={horizon}
        horizons={horizons}
        onHorizonChange={handleHorizonChange}
        onRefresh={handleRefresh}
        loading={loading}
        generatedAt={data?.generatedAt}
      />

      {data && (
        <>
          <DecisionSummaryCards
            summary={data.summary}
            executive={data.executiveSummary}
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DecisionList decisions={data.decisions} />
            </div>
            <div className="space-y-6">
              <DecisionProjectedValues projected={data.projected} />
              <DecisionRecommendations recommendations={data.recommendations} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}