// frontend/src/pages/Risk.jsx
// SSOT v2.0.0-prod

import React, { useState, useEffect, useCallback } from 'react';
import riskService from '../services/risk/riskService';

import RiskHeader from '../components/risk/RiskHeader';
import RiskSummaryCards from '../components/risk/RiskSummaryCards';
import RiskDomainGrid from '../components/risk/RiskDomainGrid';
import RiskRecommendations from '../components/risk/RiskRecommendations';
import RiskProjectedValues from '../components/risk/RiskProjectedValues';
import RiskLoading from '../components/risk/RiskLoading';
import RiskError from '../components/risk/RiskError';

const DEFAULT_HORIZON = '30D';

export default function RiskPage() {
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [horizons, setHorizons] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return <RiskLoading />;
  }

  if (error && !data) {
    return <RiskError message={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="risk-page p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
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