/**
 * What-If Analyzer Component
 * Dark mode - Consistent with Analytics theme
 */

import React, { useState } from 'react';

const WhatIfAnalyzer = ({ whatIf = {}, onAnalyze, loading = false }) => {
  const [changes, setChanges] = useState([
    { type: 'PRICE_INCREASE', value: 5, label: 'Price' },
    { type: 'VOLUME_INCREASE', value: 5, label: 'Volume' },
    { type: 'COGS_DECREASE', value: 5, label: 'COGS' },
    { type: 'EXPENSE_DECREASE', value: 5, label: 'Expenses' },
  ]);

  const handleChange = (index, field, value) => {
    const updated = [...changes];
    updated[index] = { ...updated[index], [field]: value };
    setChanges(updated);
  };

  const handleAnalyze = () => {
    if (onAnalyze) {
      const formattedChanges = changes
        .filter(c => c.value !== 0)
        .map(c => ({
          type: c.type,
          value: c.value / 100,
          label: c.label,
        }));
      onAnalyze(formattedChanges);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₦0';
    }
    return `₦${Math.round(value).toLocaleString()}`;
  };

  const getImpactColor = (value) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getImpactArrow = (value) => {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '→';
  };

  const hasData = whatIf && whatIf.available;

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">What-If Analysis</h3>

      <div className="space-y-3 mb-4">
        {changes.map((change, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-sm text-slate-400 w-16">{change.label}</span>
            <input
              type="range"
              min="-50"
              max="50"
              value={change.value}
              onChange={(e) => handleChange(index, 'value', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-sm font-medium text-slate-300 w-12">
              {change.value > 0 ? '+' : ''}{change.value}%
            </span>
          </div>
        ))}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Run What-If Analysis'}
        </button>
      </div>

      {hasData && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-400">Original Profit</p>
              <p className="text-lg font-bold text-slate-100">
                {formatCurrency(whatIf.original?.profit || 0)}
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-400">New Profit</p>
              <p className="text-lg font-bold text-slate-100">
                {formatCurrency(whatIf.modified?.profit || 0)}
              </p>
            </div>
          </div>

          {whatIf.summary && (
            <div className="mt-3 text-center">
              <p className="text-sm">
                <span className={getImpactColor(whatIf.summary.profitImpact)}>
                  {getImpactArrow(whatIf.summary.profitImpact)} 
                  {Math.abs(whatIf.summary.profitImpact).toFixed(1)}%
                </span>
                <span className="text-slate-400 ml-2">
                  {whatIf.summary.text || ''}
                </span>
              </p>
            </div>
          )}

          {whatIf.metadata?.changesApplied?.length > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              <p className="font-medium text-slate-400">Changes applied:</p>
              <ul className="list-disc list-inside">
                {whatIf.metadata.changesApplied.map((change, idx) => (
                  <li key={idx}>
                    {change.type}: {Math.round(change.clampedValue * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!hasData && !loading && (
        <p className="text-sm text-slate-400 text-center">
          Adjust the sliders and click "Run What-If Analysis" to see impacts
        </p>
      )}
    </div>
  );
};

export default WhatIfAnalyzer;