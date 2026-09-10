import React from 'react';

const priorityBadge = {
  CRITICAL: 'bg-red-900/60 text-red-300 border border-red-800',
  HIGH: 'bg-orange-900/60 text-orange-300 border border-orange-800',
  MEDIUM: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
  LOW: 'bg-emerald-900/60 text-emerald-300 border border-emerald-800',
};

export default function DecisionList({ decisions = [] }) {
  if (!decisions.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        No decisions generated for this horizon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">
        Decisions ({decisions.length})
      </h2>
      <div className="space-y-3">
        {decisions.map((d) => (
          <div
            key={d.id || d.type}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium text-gray-100">{d.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {d.category} · {d.type}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  priorityBadge[d.priority] || priorityBadge.MEDIUM
                }`}
              >
                {d.priorityLabel || d.priority}
              </span>
            </div>

            {d.summary && (
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {d.summary}
              </p>
            )}

            <p className="mt-2 text-sm text-indigo-400">
              → {d.recommendation}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>Confidence: {d.confidence}%</span>
              <span>Timeframe: {d.timeframe}</span>
              {d.severity && <span>Severity: {d.severityLabel || d.severity}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}