// frontend/src/components/Suppliers/SummaryCards.jsx

import { Users, UserCheck, ShoppingBag, DollarSign } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Suppliers',
      value: summary.total || 0,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Active Suppliers',
      value: summary.active || 0,
      icon: UserCheck,
      color: 'green',
    },
    {
      title: 'With Purchases',
      value: summary.withPurchases || 0,
      icon: ShoppingBag,
      color: 'purple',
    },
    {
      title: 'Total Purchases',
      value: `₦${(summary.totalPurchases || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'orange',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
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