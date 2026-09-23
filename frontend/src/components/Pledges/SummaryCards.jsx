// frontend/src/components/Pledges/SummaryCards.jsx

import { HandCoins, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Pledges',
      value: summary.totalCount || 0,
      icon: HandCoins,
      color: 'blue',
    },
    {
      title: 'Total Pledged',
      value: formatCurrency(summary.totalPledged),
      icon: DollarSign,
      color: 'purple',
    },
    {
      title: 'Fulfilled',
      value: formatCurrency(summary.totalFulfilled),
      icon: CheckCircle2,
      color: 'green',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary.totalOutstanding),
      icon: AlertTriangle,
      color: 'amber',
      highlight: (summary.totalOutstanding || 0) > 0,
    },
  ];

  const colorClasses = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  };

  const iconColors = {
    blue:   'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    green:  'text-green-600 dark:text-green-400',
    amber:  'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`p-4 rounded-lg border ${colorClasses[card.color]}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium opacity-80">{card.title}</p>
                <p className="font-bold mt-1 truncate text-2xl">{card.value}</p>
              </div>
              <Icon className={`w-8 h-8 flex-shrink-0 ${iconColors[card.color]}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;