// frontend/src/pages/Advisor.jsx
// Dark theme back button

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import advisorService from '../services/advisor/advisorService';
import AdvisorHeader from '../components/advisor/AdvisorHeader';
import AdvisorSummaryCards from '../components/advisor/AdvisorSummaryCards';
import AdvisorInsightList from '../components/advisor/AdvisorInsightList';
import AdvisorRecommendations from '../components/advisor/AdvisorRecommendations';
import AdvisorLoading from '../components/advisor/AdvisorLoading';
import AdvisorError from '../components/advisor/AdvisorError';

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

export default function AdvisorPage() {
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

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Advisor</h1>
        </div>
        <AdvisorLoading />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={handleBack} />
          <h1 className="text-2xl font-bold text-gray-100">Advisor</h1>
        </div>
        <AdvisorError message={error} onRetry={() => load(horizon)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-950 text-gray-100 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onBack={handleBack} />
      </div>

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