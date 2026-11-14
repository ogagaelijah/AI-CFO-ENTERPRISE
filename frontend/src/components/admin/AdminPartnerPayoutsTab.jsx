// frontend/src/components/admin/AdminPartnerPayoutsTab.jsx
// v1.0.0 — Admin view to approve or reject partner payout requests.

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Loader2, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';

export default function AdminPartnerPayoutsTab() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/admin/partners/payouts');
      if (res.data?.success) setPayouts(res.data.data);
    } catch (err) {
      setError('Failed to load payout requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleProcess = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this payout as ${status}?`)) return;
    
    setProcessing(id);
    try {
      await api.put(`/admin/partners/payouts/${id}`, { status });
      fetchPayouts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = payouts.filter(p => 
    p.partner_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.partner_email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></div>;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Partner Payouts</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Approve withdrawal requests and mark them as paid.</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search partner..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white w-full sm:w-64 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No pending payout requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Requested Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{p.partner_name}</p>
                      <p className="text-xs text-gray-500">{p.partner_email}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                      ₦{Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        p.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleProcess(p.id, 'APPROVED')}
                            disabled={processing === p.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                            title="Approve & Mark Paid"
                          >
                            {processing === p.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => handleProcess(p.id, 'REJECTED')}
                            disabled={processing === p.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Reject (Refunds wallet)"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}