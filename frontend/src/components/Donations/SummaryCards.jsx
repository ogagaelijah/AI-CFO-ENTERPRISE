// frontend/src/components/Donations/SummaryCards.jsx

import { Heart, DollarSign, TrendingUp, HandCoins } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Donations',
      value: summary.totalCount || 0,
      icon: Heart,
      color: 'rose',
    },
    {
      title: 'Total Amount',
      value: formatCurrency(summary.totalAmount),
      icon: DollarSign,
      color: 'purple',
    },
    {
      title: 'Last 30 Days',
      value: formatCurrency(summary.last30Days),
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Today',
      value: formatCurrency(summary.todayTotal),
      icon: HandCoins,
      color: 'amber',
    },
  ];

  const colorClasses = {
    rose:   'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  };

  const iconColors = {
    rose:   'text-rose-600 dark:text-rose-400',
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