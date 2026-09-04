// frontend/src/pages/Decisions.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lightbulb, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const Decisions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading decisions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Decisions</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
        <Lightbulb className="w-16 h-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Decisions</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Recommendations, priorities, actions, break-even analysis, impact analysis, and scenario comparison will be displayed here.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          🚧 Coming soon — Integration in progress
        </p>
      </div>
    </div>
  );
};

export default Decisions;