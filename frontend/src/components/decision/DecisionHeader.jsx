import React from 'react';

export default function DecisionHeader({
  horizon,
  horizons = [],
  onHorizonChange,
  onRefresh,
  loading,
  generatedAt,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Decisions</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pure consumer of Risk · SSOT top-down
          {generatedAt && (
            <span className="ml-2">
              · Generated {new Date(generatedAt).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={horizon}
          onChange={(e) => onHorizonChange(e.target.value)}
          className="border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {horizons.length > 0
            ? horizons.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))
            : (
              <>
                <option value="7D">7 Days</option>
                <option value="14D">14 Days</option>
                <option value="30D">30 Days</option>
                <option value="60D">60 Days</option>
                <option value="90D">90 Days</option>
                <option value="6M">6 Months</option>
                <option value="12M">12 Months</option>
              </>
            )}
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}