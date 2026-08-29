// frontend/src/components/Inventory/InventorySummary.jsx
import { Package, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const InventorySummary = ({ summary }) => {
  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };

  const cards = [
    {
      title: 'Total Items',
      value: summary.total_items || 0,
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Total Quantity',
      value: summary.total_quantity || 0,
      icon: Package,
      color: 'indigo',
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(summary.total_cost_value),
      icon: DollarSign,
      color: 'green',
    },
    {
      title: 'Potential Profit',
      value: formatCurrency(summary.total_profit),
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    green: 'text-green-600 dark:text-green-400',
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

export default InventorySummary;