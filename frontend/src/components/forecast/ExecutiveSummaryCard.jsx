/**
 * Executive Summary Card Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';

const ExecutiveSummaryCard = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-700 rounded w-48"></div>
          <div className="h-6 bg-slate-700 rounded w-20"></div>
        </div>
        <div className="h-4 bg-slate-700 rounded w-full mb-3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <div className="h-4 bg-slate-700 rounded w-16 mx-auto mb-2"></div>
              <div className="h-6 bg-slate-700 rounded w-24 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 text-center text-slate-400">
        No forecast data available. Continue recording transactions to enable forecasting.
      </div>
    );
  }

  const { keyMetrics, riskSummary, status, statusColor, executiveSummary } = data;

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₦0';
    }
    return `₦${Math.round(value).toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'CRITICAL': 'bg-red-900/50 text-red-400 border-red-800',
      'WARNING': 'bg-orange-900/50 text-orange-400 border-orange-800',
      'POSITIVE': 'bg-green-900/50 text-green-400 border-green-800',
      'NEUTRAL': 'bg-slate-700/50 text-slate-300 border-slate-600',
    };
    return badges[status] || badges['NEUTRAL'];
  };

  const getStatusEmoji = (status) => {
    const map = {
      'CRITICAL': '🚨',
      'WARNING': '⚠️',
      'POSITIVE': '✅',
      'NEUTRAL': 'ℹ️',
    };
    return map[status] || 'ℹ️';
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Executive Summary</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(status)}`}>
            {getStatusEmoji(status)} {status}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          {executiveSummary?.narrative || 'No forecast narrative available'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-700/50">
        <div className="p-4 text-center">
          <p className="text-sm text-slate-400">Revenue</p>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(keyMetrics?.revenue || 0)}</p>
          <p className="text-xs text-slate-500">Confidence: {keyMetrics?.revenueConfidence || 0}%</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-sm text-slate-400">Profit</p>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(keyMetrics?.profit || 0)}</p>
          <p className="text-xs text-slate-500">Confidence: {keyMetrics?.profitConfidence || 0}%</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-sm text-slate-400">Cash Flow</p>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(keyMetrics?.cashFlow || 0)}</p>
          <p className="text-xs text-slate-500">Confidence: {keyMetrics?.cashConfidence || 0}%</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-sm text-slate-400">Risk Level</p>
          <p className="text-xl font-bold text-slate-100">{riskSummary?.overallSeverity || 'LOW'}</p>
          <p className="text-xs text-slate-500">{riskSummary?.total || 0} risks detected</p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryCard;