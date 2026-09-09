/**
 * Confidence Indicator Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';

const ConfidenceIndicator = ({ confidence = {}, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 bg-slate-700 rounded w-24"></div>
              <div className="h-4 bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!confidence || !confidence.available) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Confidence</h3>
        <p className="text-slate-400 text-sm">No confidence data available</p>
      </div>
    );
  }

  const { results, bestMetric, maxScore, summary } = confidence;

  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const metricLabels = {
    'revenue': 'Revenue',
    'profit': 'Profit',
    'cashFlow': 'Cash Flow',
    'inventory': 'Inventory',
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Confidence</h3>
        {bestMetric && (
          <span className="text-xs text-slate-400">
            Best: {metricLabels[bestMetric] || bestMetric} ({Math.round(maxScore)}%)
          </span>
        )}
      </div>

      <div className="space-y-3">
        {Object.entries(results).map(([metric, data]) => {
          const label = metricLabels[metric] || metric;
          const score = data.score || 0;
          
          return (
            <div key={metric} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className={`font-medium ${getConfidenceColor(score)}`}>
                  {Math.round(score)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`${getConfidenceBarColor(score)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                ></div>
              </div>
              {data.factors?.dataPoints > 0 && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span>{data.factors.dataPoints} data points</span>
                  {data.factors.volatility !== undefined && (
                    <span>• Volatility: {data.factors.volatility}%</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {summary && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">{summary}</p>
        </div>
      )}
    </div>
  );
};

export default ConfidenceIndicator;