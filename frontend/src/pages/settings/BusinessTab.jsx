// src/pages/settings/BusinessTab.jsx
import { useState } from 'react';
import { Save } from 'lucide-react';
import api from '../../services/api';

const BusinessTab = ({ businessData, setBusinessData, industries }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleBusinessUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.put('/business', {
        name: businessData.name,
        industry: businessData.industry,
      });
      if (res.data.success) {
        setSuccess('Business updated successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">🏢 Business Settings</h2>
      <form onSubmit={handleBusinessUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
          <input
            type="text"
            value={businessData.name}
            onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
          <select
            value={businessData.industry}
            onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
            required
          >
            <option value="">Select Industry</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        {success && <p className="text-green-600 dark:text-green-400">{success}</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-70"
        >
          {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </form>
    </div>
  );
};

export default BusinessTab;