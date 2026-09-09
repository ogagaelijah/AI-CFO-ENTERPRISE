/**
 * Scenario Comparison Component
 * Dark mode - Consistent with Analytics theme
 */

import React, { useState } from 'react';

const ScenarioComparison = ({ scenarios = {}, loading = false }) => {
  const [activeView, setActiveView] = useState('revenue');

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 bg-slate-700 rounded w-24"></div>
              <div className="h-4 bg-slate-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!scenarios || !scenarios.available) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Scenarios</h3>
        <p className="text-slate-400 text-sm">Scenarios not available</p>
      </div>
    );
  }

  const { conservative, expected, optimistic, comparison } = scenarios;

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₦0';
    }
    return `₦${Math.round(value).toLocaleString()}`;
  };

  const getScenarioColor = (type) => {
    const colors = {
      'CONSERVATIVE': 'border-red-800/50 bg-red-900/20',
      'EXPECTED': 'border-yellow-800/50 bg-yellow-900/20',
      'OPTIMISTIC': 'border-green-800/50 bg-green-900/20',
    };
    return colors[type] || 'border-slate-700/50 bg-slate-800/30';
  };

  const getScenarioBadgeColor = (type) => {
    const colors = {
      'CONSERVATIVE': 'bg-red-900/30 text-red-400 border-red-800',
      'EXPECTED': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
      'OPTIMISTIC': 'bg-green-900/30 text-green-400 border-green-800',
    };
    return colors[type] || 'bg-slate-700/30 text-slate-300 border-slate-600';
  };

  const scenariosList = [conservative, expected, optimistic].filter(Boolean);

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Scenarios</h3>
      
      <div className="flex space-x-2 mb-4">
        {['revenue', 'profit', 'cashFlow'].map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveView(metric)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              activeView === metric
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenariosList.map((scenario) => {
          if (!scenario) return null;
          const values = scenario.values || {};
          const activeValue = values[activeView] || 0;
          
          return (
            <div 
              key={scenario.type}
              className={`border rounded-xl p-4 ${getScenarioColor(scenario.type)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getScenarioBadgeColor(scenario.type)}`}>
                  {scenario.label}
                </span>
                <span className="text-xs text-slate-500">
                  {scenario.confidence?.level || 'Unknown'}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {formatCurrency(activeValue)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </p>
              {scenario.assumptions && scenario.assumptions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500">
                    {scenario.assumptions.slice(0, 2).join(' • ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {comparison && comparison[activeView] && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Range:</span>
            <span className="font-medium text-slate-300">
              {formatCurrency(comparison[activeView].conservative)} → {formatCurrency(comparison[activeView].optimistic)}
            </span>
            <span className="text-slate-400">Variance:</span>
            <span className="font-medium text-slate-300">
              {comparison[activeView].varianceFormatted || '0%'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioComparison;