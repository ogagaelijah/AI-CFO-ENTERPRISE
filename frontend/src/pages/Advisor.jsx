import React, { useState, useEffect, useCallback } from 'react';
import advisorService from '../services/advisor/advisorService';
import AdvisorHeader from '../components/advisor/AdvisorHeader';
import AdvisorSummaryCards from '../components/advisor/AdvisorSummaryCards';
import AdvisorInsightList from '../components/advisor/AdvisorInsightList';
import AdvisorRecommendations from '../components/advisor/AdvisorRecommendations';
import AdvisorLoading from '../components/advisor/AdvisorLoading';
import AdvisorError from '../components/advisor/AdvisorError';

const DEFAULT_HORIZON = '30D';

export default function AdvisorPage() {
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [horizons, setHorizons] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHorizons = useCallback(async () => {
    try { setHorizons(await advisorService.getHorizons()); }
    catch (e) { console.warn(e); }
  }, []);

  const load = useCallback(async (h = horizon) => {
    setLoading(true); setError(null);
    try { setData(await advisorService.generate({ horizon: h })); }
    catch (e) { setError(e.message || 'Failed'); setData(null); }
    finally { setLoading(false); }
  }, [horizon]);

  useEffect(() => { loadHorizons(); }, [loadHorizons]);
  useEffect(() => { load(horizon); }, [horizon]);

  if (loading && !data) return <AdvisorLoading />;
  if (error && !data) return <AdvisorError message={error} onRetry={() => load(horizon)} />;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
      <AdvisorHeader
        horizon={horizon}
        horizons={horizons}
        onHorizonChange={setHorizon}
        onRefresh={() => load(horizon)}
        loading={loading}
        generatedAt={data?.generatedAt}
      />
      {data && (
        <>
          <AdvisorSummaryCards summary={data.summary} />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AdvisorInsightList insights={data.insights} />
            </div>
            <AdvisorRecommendations recommendations={data.recommendations} />
          </div>
        </>
      )}
    </div>
  );
}