// frontend/src/pages/Analytics.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, AlertCircle } from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder - will connect to backend later
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
        <BarChart3 className="w-16 h-16 text-primary-600 dark:text-gold-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          KPI dashboard, financial ratios, trends, concentration analysis, health score, and performance scoring will be displayed here.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          🚧 Coming soon — Integration in progress
        </p>
      </div>
    </div>
  );
};

export default Analytics;