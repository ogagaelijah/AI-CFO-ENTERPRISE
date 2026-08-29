// frontend/src/components/Payments/SummaryCards.jsx

import { DollarSign, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Received',
      value: `₦${(summary?.total_in || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Total Paid',
      value: `₦${(summary?.total_out || 0).toLocaleString()}`,
      icon: TrendingDown,
      color: 'red',
    },
    {
      title: 'Net Cash Flow',
      value: `₦${(summary?.net_flow || 0).toLocaleString()}`,
      icon: ArrowUpDown,
      color: summary?.net_flow >= 0 ? 'blue' : 'orange',
    },
    {
      title: 'Total Transactions',
      value: summary?.total_payments || 0,
      icon: DollarSign,
      color: 'purple',
    },
  ];

  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
  };

  const iconColors = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`p-4 rounded-lg border ${colorClasses[card.color]} transition`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <Icon className={`w-8 h-8 ${iconColors[card.color]}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;