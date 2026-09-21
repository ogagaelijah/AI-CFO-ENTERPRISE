// frontend/src/components/Terms/SummaryCards.jsx

import { Calendar, CheckCircle2, Archive, Zap } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Terms',
      value: summary.total || 0,
      icon: Calendar,
      color: 'blue',
    },
    {
      title: 'Active',
      value: summary.active || 0,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      title: 'Completed',
      value: summary.completed || 0,
      icon: Archive,
      color: 'gray',
    },
    {
      title: 'Current Term',
      value: summary.activeName || '—',
      icon: Zap,
      color: 'amber',
      isText: true,
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    gray: 'text-gray-500 dark:text-gray-400',
    amber: 'text-amber-600 dark:text-amber-400',
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
                <p className="text-sm font-medium opacity-80">{card.title}</p>
                <p
                  className={`font-bold mt-1 truncate ${
                    card.isText ? 'text-base' : 'text-2xl'
                  }`}
                >
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