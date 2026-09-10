import React from 'react';

const severityBadge = {
  CRITICAL: 'bg-red-900/60 text-red-300 border border-red-800',
  HIGH: 'bg-orange-900/60 text-orange-300 border border-orange-800',
  MEDIUM: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
  LOW: 'bg-emerald-900/60 text-emerald-300 border border-emerald-800',
  INFO: 'bg-gray-800 text-gray-300 border border-gray-700',
};

export default function AdvisorInsightList({ insights = [] }) {
  if (!insights.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        No insights generated for this horizon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">
        Insights ({insights.length})
      </h2>
      <div className="space-y-3">
        {insights.map((i) => (
          <div
            key={i.id || i.title}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium text-gray-100">{i.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {i.category} · {i.type}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  severityBadge[i.severity] || severityBadge.INFO
                }`}
              >
                {i.severity}
              </span>
            </div>

            {(i.summary || i.content) && (
              <p className="mt-2 text-sm text-gray-400 line-clamp-3">
                {i.summary || i.content}
              </p>
            )}

            {i.recommendation && (
              <p className="mt-2 text-sm text-indigo-400">
                → {i.recommendation}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>Confidence: {i.confidence}%</span>
              {i.sentiment && <span>Sentiment: {i.sentiment}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}