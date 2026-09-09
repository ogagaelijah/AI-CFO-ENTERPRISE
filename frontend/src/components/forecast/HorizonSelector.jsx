/**
 * Horizon Selector Component
 * Dark mode - Consistent with Analytics theme
 */

import React from 'react';

const HORIZONS = [
  { value: '7D', label: '7 Days' },
  { value: '14D', label: '14 Days' },
  { value: '30D', label: '30 Days' },
  { value: '60D', label: '60 Days' },
  { value: '90D', label: '90 Days' },
  { value: '6M', label: '6 Months' },
  { value: '12M', label: '12 Months' },
];

const HorizonSelector = ({ 
  horizon = '30D', 
  onHorizonChange, 
  disabled = false,
  className = '',
}) => {
  const handleChange = (e) => {
    if (onHorizonChange) {
      onHorizonChange(e.target.value);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label htmlFor="horizon" className="text-sm font-medium text-slate-400">
        Horizon:
      </label>
      <select
        id="horizon"
        value={horizon}
        onChange={handleChange}
        disabled={disabled}
        className="block w-36 rounded-lg border border-slate-700/50 bg-slate-800/80 text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2"
        aria-label="Select forecast horizon"
      >
        {HORIZONS.map((h) => (
          <option key={h.value} value={h.value} className="bg-slate-800 text-slate-200">
            {h.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HorizonSelector;