// frontend/src/components/risk/RiskDomainGrid.jsx

import React from 'react';

const severityBadge = {
  CRITICAL: 'bg-red-900/60 text-red-300 border border-red-800',
  HIGH: 'bg-orange-900/60 text-orange-300 border border-orange-800',
  MEDIUM: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
  LOW: 'bg-emerald-900/60 text-emerald-300 border border-emerald-800',
};

export default function RiskDomainGrid({ risks = {} }) {
  const list = risks.all || [];

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        No domain risks detected for this horizon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">Domain Risks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((risk) => (
          <div
            key={risk.id || risk.type}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-gray-100">{risk.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{risk.type}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  severityBadge[risk.severity] || severityBadge.LOW
                }`}
              >
                {risk.severityLabel || risk.severity}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="font-semibold text-gray-200">
                Score: {risk.score}
              </span>
              {risk.trend?.direction && (
                <span className="text-gray-400">
                  Trend: {risk.trend.direction}
                </span>
              )}
            </div>

            {risk.description && (
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {risk.description}
              </p>
            )}

            {risk.recommendation && (
              <p className="mt-2 text-sm text-indigo-400">
                → {risk.recommendation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}