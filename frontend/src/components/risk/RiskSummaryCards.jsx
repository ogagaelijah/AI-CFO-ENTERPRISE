// frontend/src/components/risk/RiskSummaryCards.jsx

import React from 'react';

const severityStyles = {
  CRITICAL: 'bg-red-950/60 border-red-800 text-red-300',
  HIGH: 'bg-orange-950/60 border-orange-800 text-orange-300',
  MEDIUM: 'bg-yellow-950/60 border-yellow-800 text-yellow-300',
  LOW: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
};

export default function RiskSummaryCards({ summary = {}, executive = {} }) {
  const severity = summary.overallSeverity || 'LOW';
  const style = severityStyles[severity] || severityStyles.LOW;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className={`rounded-xl border p-4 ${style}`}>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">
          Overall Severity
        </p>
        <p className="text-2xl font-bold mt-1">{severity}</p>
        <p className="text-sm mt-1 opacity-80">Score: {summary.overallScore ?? 0}/100</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Critical
        </p>
        <p className="text-2xl font-bold text-red-400 mt-1">
          {summary.criticalRisks ?? 0}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          High
        </p>
        <p className="text-2xl font-bold text-orange-400 mt-1">
          {summary.highRisks ?? 0}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Total Risks
        </p>
        <p className="text-2xl font-bold text-gray-100 mt-1">
          {summary.riskCount ?? 0}
        </p>
      </div>

      {executive?.summary && (
        <div className="col-span-2 md:col-span-4 rounded-xl border border-gray-800 bg-gray-900/80 p-4">
          <p className="text-sm text-gray-300">{executive.summary}</p>
        </div>
      )}
    </div>
  );
}