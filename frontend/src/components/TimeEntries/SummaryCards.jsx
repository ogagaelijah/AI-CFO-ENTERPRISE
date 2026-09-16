// frontend/src/components/TimeEntries/SummaryCards.jsx

import { Clock, CheckCircle2, Receipt, AlertCircle } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Hours',
      value: formatHours(summary.totalHours),
      icon: Clock,
      color: 'blue',
    },
    {
      title: 'Billable Hours',
      value: formatHours(summary.billableHours),
      icon: CheckCircle2,
      color: 'green',
    },
    {
      title: 'Uninvoiced Hours',
      value: formatHours(summary.uninvoicedHours),
      icon: AlertCircle,
      color: 'amber',
    },
    {
      title: 'Invoiced Hours',
      value: formatHours(summary.invoicedHours),
      icon: Receipt,
      color: 'purple',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`p-4 rounded-lg border ${colorClasses[card.color]} transition`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium opacity-80 truncate">{card.title}</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{card.value}</p>
              </div>
              <Icon className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ${iconColors[card.color]}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

function formatHours(n) {
  const v = Number(n) || 0;
  // e.g. 7.5 → "7.5h", 8 → "8h", 0 → "0h"
  return `${v % 1 === 0 ? v : v.toFixed(2).replace(/\.?0+$/, '')}h`;
}

export default SummaryCards;