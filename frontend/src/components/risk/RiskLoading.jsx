// frontend/src/components/risk/RiskLoading.jsx

import React from 'react';

export default function RiskLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-gray-400 bg-gray-950">
      <div className="w-10 h-10 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-sm">Loading risk assessment from Forecast…</p>
    </div>
  );
}