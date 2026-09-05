// frontend/src/components/Reports/DailyReport.jsx

const DailyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this date.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different date.</p>
      </div>
    );
  }

  const { date, today, comparison, transactions, alerts } = data;

  const safeToday = today || {
    revenue: 0,
    grossProfit: 0,
    grossMargin: 0,
    netProfit: 0,
    expenses: 0,
    salesCount: 0,
    inventory: { totalItems: 0, totalValue: 0, lowStockCount: 0, lowStockItems: [] },
  };

  const safeInventory = safeToday.inventory || {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    lowStockItems: [],
  };

  const lowStockItems = Array.isArray(safeInventory.lowStockItems)
    ? safeInventory.lowStockItems
    : [];

  // Show both absolute + percentage when available
  const renderChange = (percentageChange, absoluteChange) => {
    const hasPercentage = percentageChange != null;
    const hasAbsolute = absoluteChange != null && absoluteChange !== 0;

    if (!hasPercentage && !hasAbsolute) {
      return <span className="text-gray-500 dark:text-gray-400">—</span>;
    }

    const isPositive = hasPercentage
      ? percentageChange >= 0
      : absoluteChange > 0;

    const arrow = isPositive ? '↑' : '↓';
    const colorClass = isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

    if (hasPercentage && hasAbsolute) {
      return (
        <span className={colorClass}>
          {arrow} {formatCurrency(Math.abs(absoluteChange))} ({Math.abs(percentageChange).toFixed(1)}%)
        </span>
      );
    }

    if (hasPercentage) {
      return (
        <span className={colorClass}>
          {arrow} {Math.abs(percentageChange).toFixed(1)}%
        </span>
      );
    }

    return (
      <span className={colorClass}>
        {arrow} {formatCurrency(Math.abs(absoluteChange))}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Daily Report
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {date
            ? new Date(date).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'No date available'}
        </p>

        {/* Financial Summary - Correct Order + Labels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {/* Revenue */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(safeToday.revenue)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Product Sales + Other Income
            </p>
          </div>

          {/* Gross Profit */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(safeToday.grossProfit)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Product Sales − Cost of Goods
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Margin: {formatPercentage(safeToday.grossMargin)}
            </p>
          </div>

          {/* Expenses (moved before Net Profit) */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(safeToday.expenses)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Operating Expenses
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(safeToday.netProfit)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Gross Profit − Expenses + Other Income
            </p>
          </div>
        </div>

        {/* Sales & Inventory Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sales Count</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {safeToday.salesCount || 0}
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Inventory Items</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {safeInventory.totalItems || 0}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Value</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(safeInventory.totalValue)}
            </p>
          </div>
          {safeInventory.lowStockCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠️ Low Stock</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {safeInventory.lowStockCount}
              </p>
            </div>
          )}
        </div>

        {/* vs Previous Day */}
        {comparison && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              vs Previous Day
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm">
                Revenue: {renderChange(comparison.revenueChange, comparison.revenueAbsoluteChange)}
              </span>
              <span className="text-sm">
                Profit: {renderChange(comparison.netProfitChange, comparison.netProfitAbsoluteChange)}
              </span>
            </div>
          </div>
        )}

        {/* Low stock alert with item names */}
        {alerts?.lowStock === true && lowStockItems.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
              ⚠️ {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
              {lowStockItems.map((item, idx) => (
                <li key={idx}>
                  {item.name} (Qty: {item.quantity})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Transactions */}
      {transactions && transactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Key Transactions
          </h4>
          <div className="space-y-1">
            {transactions.slice(0, 5).map((t, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {t.type}: {t.description}
                </span>
                <span
                  className={`font-medium ${
                    t.type === 'SALE' || t.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReport;