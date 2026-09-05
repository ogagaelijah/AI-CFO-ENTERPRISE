// frontend/src/components/Reports/WeeklyReport.jsx

const WeeklyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this week.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different week.</p>
      </div>
    );
  }

  const { 
    revenue, 
    grossProfit, 
    grossMargin, 
    expenses, 
    netProfit, 
    netMargin, 
    topProducts, 
    topCustomers,
    inventory,
    weekOverWeek 
  } = data;

  const safeInventory = inventory || { 
    totalItems: 0, 
    totalValue: 0, 
    lowStockCount: 0,
    lowStockItems: [] 
  };

  const lowStockItems = Array.isArray(safeInventory.lowStockItems)
    ? safeInventory.lowStockItems
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Weekly Report
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {data.period?.start ? new Date(data.period.start).toLocaleDateString('en-NG', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) : 'N/A'} - {data.period?.end ? new Date(data.period.end).toLocaleDateString('en-NG', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) : 'N/A'}
        </p>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(revenue || 0)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Product Sales + Other Income
            </p>
          </div>

          {/* Gross Profit */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(grossProfit || 0)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Product Sales − Cost of Goods
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Margin: {formatPercentage(grossMargin || 0)}
            </p>
          </div>

          {/* Expenses */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(expenses || 0)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Operating Expenses
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(netProfit || 0)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Gross Profit − Expenses + Other Income
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Margin: {formatPercentage(netMargin || 0)}
            </p>
          </div>
        </div>

        {/* Inventory Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Inventory Items</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {safeInventory.totalItems || 0}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Value</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(safeInventory.totalValue || 0)}
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

        {/* Low stock alert with item names */}
        {safeInventory.lowStockCount > 0 && lowStockItems.length > 0 && (
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

        {/* Week-over-Week Comparison */}
        {weekOverWeek && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Week-over-Week</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`text-sm ${weekOverWeek.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Revenue: {weekOverWeek.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(weekOverWeek.revenueChange || 0).toFixed(1)}%
              </span>
              <span className={`text-sm ${weekOverWeek.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Profit: {weekOverWeek.profitChange >= 0 ? '↑' : '↓'} {Math.abs(weekOverWeek.profitChange || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Products & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topProducts && topProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🏆 Top Products</h4>
            <div className="space-y-1">
              {topProducts.slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1">
                  <span className="text-gray-600 dark:text-gray-400">{p.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topCustomers && topCustomers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">👥 Top Customers</h4>
            <div className="space-y-1">
              {topCustomers.slice(0, 5).map((c, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1">
                  <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyReport;