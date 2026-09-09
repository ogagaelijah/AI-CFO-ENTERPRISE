/**
 * Forecast Grid Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';
import ForecastCard from './ForecastCard';

const ForecastGrid = ({ forecasts = {}, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ForecastCard key={i} loading={true} />
        ))}
      </div>
    );
  }

  if (!forecasts || Object.keys(forecasts).length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-8 text-center text-slate-400">
        No forecast data available
      </div>
    );
  }

  const metrics = [
    { key: 'revenue', title: 'Revenue', icon: '💰' },
    { key: 'profit', title: 'Profit', icon: '📈' },
    { key: 'cashFlow', title: 'Cash Flow', icon: '💵' },
    { key: 'expenses', title: 'Expenses', icon: '📊' },
    { key: 'inventory', title: 'Inventory', icon: '📦' },
    { key: 'receivables', title: 'Receivables', icon: '📋' },
    { key: 'payables', title: 'Payables', icon: '📝' },
    { key: 'cogs', title: 'COGS', icon: '🏷️' },
  ];

  const availableMetrics = metrics.filter(({ key }) => {
    const metric = forecasts[key];
    return metric && (metric.available || metric.forecast > 0);
  });

  if (availableMetrics.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">No forecast metrics available</p>
        <p className="text-sm text-slate-500 mt-1">
          Continue recording transactions to generate forecasts
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {availableMetrics.map(({ key, title, icon }) => {
        const metric = forecasts[key];
        return (
          <ForecastCard
            key={key}
            title={title}
            value={metric?.forecast || 0}
            confidence={metric?.confidence || 0}
            dataStatus={metric?.dataStatus || 'INSUFFICIENT'}
            icon={icon}
          />
        );
      })}
    </div>
  );
};

export default ForecastGrid;