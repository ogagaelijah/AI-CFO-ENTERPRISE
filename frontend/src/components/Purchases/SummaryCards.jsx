// frontend/src/components/Purchases/SummaryCards.jsx
import { ShoppingCart, TrendingUp, Calendar, Users } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    { key: 'total_purchases', label: 'Total Purchases', icon: ShoppingCart, value: summary?.total_purchases || 0 },
    { key: 'total_amount', label: 'Total Spent', icon: TrendingUp, value: `₦${(summary?.total_amount || 0).toLocaleString()}`, textColor: 'text-blue-600 dark:text-blue-400' },
    { key: 'suppliers_used', label: 'Suppliers', icon: Users, value: summary?.suppliers_used || 0 },
    { key: 'total_items', label: 'Items Purchased', icon: Calendar, value: summary?.total_items || 0 },
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