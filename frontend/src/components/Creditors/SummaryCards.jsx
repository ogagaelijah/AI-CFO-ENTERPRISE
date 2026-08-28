// frontend/src/components/Creditors/SummaryCards.jsx
import { Users, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    { key: 'active_count', label: 'Active Creditors', icon: Users, value: summary?.active_count || 0 },
    { key: 'total_owed', label: 'Total Owed', icon: TrendingUp, value: `₦${(summary?.total_owed || 0).toLocaleString()}`, textColor: 'text-red-600 dark:text-red-400' },
    { key: 'total_outstanding', label: 'Outstanding', icon: TrendingDown, value: `₦${(summary?.total_outstanding || 0).toLocaleString()}`, textColor: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'paid_count', label: 'Fully Paid', icon: AlertCircle, value: summary?.paid_count || 0, textColor: 'text-green-600 dark:text-green-400' },
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