// frontend/src/components/Inventory/SummaryCards.jsx
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const SummaryCards = ({ summary }) => {
  const cards = [
    { key: 'total_items', label: 'Items', icon: Package, value: summary.total_items || 0 },
    { key: 'total_quantity', label: 'Total Stock', icon: Package, value: summary.total_quantity || 0 },
    { key: 'total_cost_value', label: 'Cost Value', icon: TrendingDown, value: `₦${(summary.total_cost_value || 0).toLocaleString()}` },
    { key: 'total_selling_value', label: 'Selling Value', icon: TrendingUp, value: `₦${(summary.total_selling_value || 0).toLocaleString()}` },
    { key: 'total_profit', label: 'Potential Profit', icon: TrendingUp, value: `₦${(summary.total_profit || 0).toLocaleString()}`, textColor: 'text-green-600 dark:text-green-400' },
    { key: 'margin', label: 'Margin', icon: TrendingUp, value: `${summary.margin || 0}%`, textColor: 'text-primary-600 dark:text-gold-400' },
    { key: 'low_stock_count', label: 'Low Stock', icon: AlertTriangle, value: summary.low_stock_count || 0, textColor: summary.low_stock_count > 0 ? 'text-yellow-600 dark:text-yellow-400' : '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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