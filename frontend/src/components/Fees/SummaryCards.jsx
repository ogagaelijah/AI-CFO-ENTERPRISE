// frontend/src/components/Fees/SummaryCards.jsx

import { Receipt, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Fees',
      value: summary.totalCount || 0,
      icon: Receipt,
      color: 'blue',
    },
    {
      title: 'Total Amount',
      value: formatCurrency(summary.totalAmount),
      icon: DollarSign,
      color: 'purple',
      isText: false,
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary.totalOutstanding),
      icon: TrendingDown,
      color: 'red',
      isText: false,
    },
    {
      title: 'Overdue',
      value: summary.overdueCount || 0,
      icon: AlertTriangle,
      color: 'amber',
    },
  ];

  const colorClasses = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  };

  const iconColors = {
    blue:   'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red:    'text-red-600 dark:text-red-400',
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
                <p className={`font-bold mt-1 truncate ${card.isText ? 'text-base' : 'text-2xl'}`}>
                  {card.value}
                </p>
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