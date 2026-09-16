// frontend/src/components/Invoices/SummaryCards.jsx

import { Receipt, DollarSign, Wallet, AlertCircle } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      title: 'Total Invoices',
      value: String(summary.totalCount || 0),
      icon: Receipt,
      color: 'blue',
    },
    {
      title: 'Total Invoiced',
      value: formatCurrency(summary.totalInvoiced),
      icon: DollarSign,
      color: 'green',
    },
    {
      title: 'Total Paid',
      value: formatCurrency(summary.totalPaid),
      icon: Wallet,
      color: 'purple',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary.totalOutstanding),
      icon: AlertCircle,
      color: summary.overdueCount > 0 ? 'red' : 'amber',
      sublabel: summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : null,
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400',
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
                <p className="text-xs sm:text-sm font-medium opacity-80 truncate">{card.title}</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{card.value}</p>
                {card.sublabel && (
                  <p className="text-[10px] sm:text-xs mt-0.5 opacity-80 truncate">{card.sublabel}</p>
                )}
              </div>
              <Icon className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ${iconColors[card.color]}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;