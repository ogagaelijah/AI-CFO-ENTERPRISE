/**
 * Forecast Error Component
 * Displays error state with retry
 */

import React from 'react';

const ForecastError = ({ 
  message = 'Failed to load forecast data',
  onRetry = null,
  retryCount = 0,
  maxRetries = 3,
  loading = false,
}) => {
  const isRetryExhausted = retryCount >= maxRetries;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Unable to Load Forecast
      </h3>
      <p className="text-red-600 mb-4">{message}</p>
      {isRetryExhausted && (
        <p className="text-sm text-red-500 mb-4">
          Multiple retry attempts failed. Please try again later.
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
};

export default ForecastError;