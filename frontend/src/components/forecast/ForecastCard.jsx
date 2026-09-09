/**
 * Forecast Card Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';

const ForecastCard = ({ 
  title, 
  value, 
  confidence = 0, 
  status = 'NEUTRAL',
  trend = null,
  dataStatus = 'SUFFICIENT',
  loading = false,
  icon = null
}) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-700 rounded w-1/3"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'POSITIVE': 'text-green-400',
      'NEGATIVE': 'text-red-400',
      'NEUTRAL': 'text-slate-300',
      'CRITICAL': 'text-red-500',
      'WARNING': 'text-orange-400'
    };
    return colors[status] || 'text-slate-300';
  };

  const getDataStatusBadge = (status) => {
    const badges = {
      'EXCELLENT': { label: 'Excellent', color: 'bg-green-900/30 text-green-400 border-green-800' },
      'SUFFICIENT': { label: 'Sufficient', color: 'bg-blue-900/30 text-blue-400 border-blue-800' },
      'MINIMAL': { label: 'Minimal', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800' },
      'INSUFFICIENT': { label: 'Insufficient', color: 'bg-red-900/30 text-red-400 border-red-800' },
    };
    return badges[status] || badges['INSUFFICIENT'];
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₦0';
    }
    return `₦${Math.round(value).toLocaleString()}`;
  };

  const badge = getDataStatusBadge(dataStatus);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {icon && <span className="text-lg">{icon}</span>}
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
          </div>
          <p className={`text-xl font-bold mt-1 ${getStatusColor(status)}`}>
            {formatCurrency(value)}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      {confidence > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Confidence</span>
            <span>{Math.round(confidence)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(confidence, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastCard;