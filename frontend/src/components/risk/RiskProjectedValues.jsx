// frontend/src/components/risk/RiskProjectedValues.jsx

import React from 'react';

const formatNaira = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

export default function RiskProjectedValues({ projected }) {
  if (!projected) return null;

  const items = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'profit', label: 'Profit (Derived)' },
    { key: 'cashFlow', label: 'Cash Flow' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'receivables', label: 'Receivables' },
    { key: 'payables', label: 'Payables' },
    { key: 'inventory', label: 'Inventory' },
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-100 mb-3">
        Projected Values (from Forecast)
      </h3>
      <dl className="space-y-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex justify-between text-sm">
            <dt className="text-gray-400">{label}</dt>
            <dd className="font-medium text-gray-100">
              {formatNaira(projected[key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        All values are projected by the Forecast engine. Risk does not recalculate.
      </p>
    </div>
  );
}