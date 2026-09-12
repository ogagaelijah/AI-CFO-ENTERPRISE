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

  const {
    date,
    today,
    comparison,
    transactions,
    alerts,
    debtors,
    creditors,
    topCustomers = [],
    topProducts = [],
  } = data;

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

  const safeDebtors = debtors || { count: 0, totalAmount: 0, top3: [] };
  const safeCreditors = creditors || { count: 0, totalAmount: 0, top3: [] };

  const safeTopCustomers = Array.isArray(topCustomers) ? topCustomers : [];
  const safeTopProducts = Array.isArray(topProducts) ? topProducts : [];

  const renderChange = (percentageChange, absoluteChange) => {
    const hasPercentage = percentageChange != null;
    const hasAbsolute = absoluteChange != null && absoluteChange !== 0;

    if (!hasPercentage && !hasAbsolute) {
      return <span className="text-gray-500 dark:text-gray-400">—</span>;
    }

    const isPositive = hasPercentage ? percentageChange >= 0 : absoluteChange > 0;
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

        {/* Financial Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(safeToday.revenue)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Product Sales + Other Income
            </p>
          </div>

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

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(safeToday.expenses)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Operating Expenses
            </p>
          </div>

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

        {/* Sales & Inventory */}
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

        {/* Low stock alert */}
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

        {/* Debtors */}
        {(safeDebtors.count > 0 || safeDebtors.totalAmount > 0) && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📋 Debtors
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Debtors</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {safeDebtors.count}
                </p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount Owed</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(safeDebtors.totalAmount)}
                </p>
              </div>
            </div>
            {safeDebtors.top3?.length > 0 && (
              <div className="space-y-1">
                {safeDebtors.top3.map((d, idx) => (
                  <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1">
                    <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Creditors */}
        {(safeCreditors.count > 0 || safeCreditors.totalAmount > 0) && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📋 Creditors
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Creditors</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {safeCreditors.count}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount Owed</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(safeCreditors.totalAmount)}
                </p>
              </div>
            </div>
            {safeCreditors.top3?.length > 0 && (
              <div className="space-y-1">
                {safeCreditors.top3.map((c, idx) => (
                  <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1">
                    <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TOP 5 CUSTOMERS (moved here) ===== */}
        {safeTopCustomers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              🏆 Top 5 Customers
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Customer</div>
                <div className="col-span-3 text-right">Revenue</div>
                <div className="col-span-3 text-right">Sales</div>
              </div>
              {safeTopCustomers.map((customer) => (
                <div
                  key={customer.rank || customer.name}
                  className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="col-span-1 font-medium text-gray-500 dark:text-gray-400">
                    {customer.rank}
                  </div>
                  <div className="col-span-5 font-medium text-gray-900 dark:text-white truncate">
                    {customer.name}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(customer.totalRevenue)}
                  </div>
                  <div className="col-span-3 text-right text-gray-600 dark:text-gray-300">
                    {customer.salesCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOP 5 PRODUCTS (moved here) ===== */}
        {safeTopProducts.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              📦 Top 5 Products
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Product</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Revenue</div>
                <div className="col-span-2 text-right">Sales</div>
              </div>
              {safeTopProducts.map((product) => (
                <div
                  key={product.rank || product.name}
                  className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="col-span-1 font-medium text-gray-500 dark:text-gray-400">
                    {product.rank}
                  </div>
                  <div className="col-span-4 font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </div>
                  <div className="col-span-2 text-right text-gray-700 dark:text-gray-200">
                    {product.quantitySold}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(product.totalRevenue)}
                  </div>
                  <div className="col-span-2 text-right text-gray-600 dark:text-gray-300">
                    {product.salesCount}
                  </div>
                </div>
              ))}
            </div>
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