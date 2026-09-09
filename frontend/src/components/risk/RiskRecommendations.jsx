// frontend/src/components/risk/RiskRecommendations.jsx

import React from 'react';

const priorityStyles = {
  CRITICAL: 'border-red-800 bg-red-950/50',
  HIGH: 'border-orange-800 bg-orange-950/50',
  MEDIUM: 'border-yellow-800 bg-yellow-950/50',
};

export default function RiskRecommendations({ recommendations = [] }) {
  if (!recommendations.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
        No high-priority recommendations.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-100 mb-3">
        Recommendations
      </h3>
      <ul className="space-y-3">
        {recommendations.map((rec, idx) => (
          <li
            key={idx}
            className={`rounded-lg border p-3 text-sm ${
              priorityStyles[rec.priority] || 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-100">{rec.title}</span>
              <span className="text-xs font-semibold uppercase text-gray-300">
                {rec.priority}
              </span>
            </div>
            <p className="mt-1 text-gray-300">{rec.recommendation}</p>
            {rec.timeframe && (
              <p className="mt-1 text-xs text-gray-500">
                Timeframe: {rec.timeframe}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}