// frontend/src/pages/Partner/PartnerDashboard.jsx
// v1.3.0 — Fixes back button to go to Settings.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Copy, CheckCircle2, Wallet, Users, Loader2, ArrowLeft } from 'lucide-react';

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/partners/dashboard');
        if (res.data?.success) setData(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('You are not yet a partner. Please apply from the Settings page.');
        } else {
          setError('Failed to load partner dashboard.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleCopyLink = () => {
    if (!data?.partner?.partnerCode) return;
    const link = `${window.location.origin}/p/${data.partner.partnerCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!data?.partner?.walletBalance || data.partner.walletBalance < 10000) return;
    setWithdrawing(true);
    try {
      const res = await api.post('/partners/withdraw', {
        amount: data.partner.walletBalance,
        bankDetails: { note: 'Manual withdrawal request' }
      });
      if (res.data?.success) {
        alert('Withdrawal requested! Admin will process it shortly.');
        const refreshed = await api.get('/partners/dashboard');
        setData(refreshed.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const { partner, referrals, withdrawalThreshold } = data;
  const canWithdraw = partner.walletBalance >= withdrawalThreshold;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* ★ FIXED: Goes to settings and replaces history */}
      <button 
        onClick={() => navigate('/settings', { replace: true })} 
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partner Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Track your referrals and earnings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 col-span-1 md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Your Referral Link</h2>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/p/${partner.partnerCode}`} 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200 px-2"
            />
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium opacity-90">Available Balance</h2>
            <Wallet className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-bold mb-4">₦{partner.walletBalance.toLocaleString()}</p>
          
          <button 
            onClick={handleWithdraw}
            disabled={!canWithdraw || withdrawing}
            className={`w-full py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
              canWithdraw 
                ? 'bg-white text-primary-700 hover:bg-gray-100' 
                : 'bg-white/30 text-white/70 cursor-not-allowed'
            }`}
          >
            {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : canWithdraw ? 'Request Withdrawal' : `Min ₦${withdrawalThreshold.toLocaleString()}`}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Your Referrals
          </h2>
        </div>
        {referrals.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No referrals yet. Share your link to start earning!</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="px-5 py-3 font-medium">Date Joined</th>
                <th className="px-5 py-3 font-medium">Months Paid</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {referrals.map((ref) => (
                <tr key={ref.id}>
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{ref.business_name}</td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{new Date(ref.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-gray-900 dark:text-gray-300">{ref.months_paid} / 6</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      ref.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}