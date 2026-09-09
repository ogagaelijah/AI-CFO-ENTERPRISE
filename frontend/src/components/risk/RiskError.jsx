// frontend/src/components/risk/RiskError.jsx

import React from 'react';

export default function RiskError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-6 bg-gray-950">
      <div className="text-red-400 text-4xl mb-3">⚠️</div>
      <h2 className="text-lg font-semibold text-gray-100 mb-2">
        Risk Assessment Failed
      </h2>
      <p className="text-sm text-gray-400 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}