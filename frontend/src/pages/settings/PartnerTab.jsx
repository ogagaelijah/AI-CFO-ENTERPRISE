// frontend/src/pages/settings/PartnerTab.jsx
// v1.0.0 — Partner Program Tab for Settings.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function PartnerTab() {
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // We try to fetch the dashboard. If it 404s, they are not a partner.
        const res = await api.get('/partners/dashboard');
        if (res.data?.success) setIsPartner(true);
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error('Failed to check partner status');
        }
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    setError('');
    try {
      const res = await api.post('/partners/apply');
      if (res.data?.success) {
        setIsPartner(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply for partner program.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full">
          <HandCoins className="w-8 h-8 text-primary-600 dark:text-gold-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Partner Program</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Earn 20% recurring commission for every business you refer to AI CFO.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {isPartner ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-3">
            🎉 You are an active partner!
          </p>
          <Link 
            to="/partner" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
          >
            Go to Partner Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-5 text-center border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Become a Partner</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Share your unique link. When someone subscribes, you earn 20% of their monthly payment for 6 months. Withdraw once you hit ₦10,000.
          </p>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</> : 'Apply to Become a Partner'}
          </button>
        </div>
      )}
    </div>
  );
}