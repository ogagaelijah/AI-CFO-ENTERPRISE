/**
 * Risk List Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';

const RiskList = ({ risks = {}, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!risks || risks.risks?.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Forecast Risks</h3>
        <p className="text-slate-400 text-sm">No significant risks detected</p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': 'bg-red-900/30 text-red-400 border-red-800',
      'HIGH': 'bg-orange-900/30 text-orange-400 border-orange-800',
      'MEDIUM': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
      'LOW': 'bg-green-900/30 text-green-400 border-green-800',
    };
    return colors[severity] || 'bg-slate-700/30 text-slate-300 border-slate-600';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      'CRITICAL': '🚨',
      'HIGH': '⚠️',
      'MEDIUM': '⚡',
      'LOW': '✅',
    };
    return icons[severity] || 'ℹ️';
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Forecast Risks</h3>
        <span className="text-sm text-slate-400">
          {risks.counts?.total || 0} risks detected
        </span>
      </div>

      <div className="space-y-3">
        {risks.risks.slice(0, 5).map((risk, index) => (
          <div 
            key={risk.id || index}
            className={`border rounded-xl p-3 ${getSeverityColor(risk.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span>{getSeverityIcon(risk.severity)}</span>
                  <span className="font-medium text-sm text-slate-200">
                    {risk.displayName || risk.metric}
                  </span>
                  <span className="text-xs text-slate-400">
                    {risk.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">{risk.description}</p>
                {risk.action && (
                  <p className="text-xs text-slate-400 mt-1">
                    💡 {risk.action}
                  </p>
                )}
              </div>
              {risk.impact > 0 && (
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap ml-2">
                  ₦{Math.round(risk.impact).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {risks.risks.length > 5 && (
        <div className="mt-3 text-center">
          <button className="text-sm text-blue-400 hover:text-blue-300">
            View all {risks.risks.length} risks
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskList;