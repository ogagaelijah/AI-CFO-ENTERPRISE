/**
 * Forecast Empty State Component
 * Displays when no forecast data is available
 */

import React from 'react';

const ForecastEmpty = ({ 
  message = 'No forecast data available',
  description = 'Continue recording transactions to enable forecasting.',
  onRefresh = null,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="text-6xl mb-4">📈</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        {description}
      </p>
      <p className="text-sm text-gray-400">
        The system needs at least 7 data points (30 days) to generate reliable forecasts.
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ForecastEmpty;