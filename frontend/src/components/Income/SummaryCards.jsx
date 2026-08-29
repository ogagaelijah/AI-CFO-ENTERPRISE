// frontend/src/components/Income/SummaryCards.jsx

import { TrendingUp, DollarSign, Tag, Calendar } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    { key: 'total_entries', label: 'Total Entries', icon: TrendingUp, value: summary?.total_entries || 0 },
    { key: 'total_amount', label: 'Total Income', icon: DollarSign, value: `₦${(summary?.total_amount || 0).toLocaleString()}`, textColor: 'text-green-600 dark:text-green-400' },
    { key: 'sources_used', label: 'Sources', icon: Tag, value: summary?.sources_used || 0 },
    { key: 'average_amount', label: 'Average', icon: Calendar, value: `₦${(summary?.average_amount || 0).toLocaleString()}` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <card.icon className="w-4 h-4" />
            <span className="text-xs">{card.label}</span>
          </div>
          <p className={`text-xl font-bold text-gray-900 dark:text-white mt-1 ${card.textColor || ''}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;