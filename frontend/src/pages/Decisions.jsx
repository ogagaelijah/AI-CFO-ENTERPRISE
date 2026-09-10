// frontend/src/pages/Decisions.jsx
// SSOT v2.0.0-prod

import React, { useState, useEffect, useCallback } from 'react';
import decisionService from '../services/decision/decisionService';

import DecisionHeader from '../components/decision/DecisionHeader';
import DecisionSummaryCards from '../components/decision/DecisionSummaryCards';
import DecisionList from '../components/decision/DecisionList';
import DecisionRecommendations from '../components/decision/DecisionRecommendations';
import DecisionProjectedValues from '../components/decision/DecisionProjectedValues';
import DecisionLoading from '../components/decision/DecisionLoading';
import DecisionError from '../components/decision/DecisionError';

const DEFAULT_HORIZON = '30D';

export default function DecisionsPage() {
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [horizons, setHorizons] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading && !data) return <DecisionLoading />;
  if (error && !data) return <DecisionError message={error} onRetry={handleRefresh} />;

  return (
    <div className="decision-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
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