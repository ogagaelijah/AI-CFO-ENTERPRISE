// frontend/src/components/Reports/MonthlyReport.jsx

const MonthlyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this month.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different month.</p>
      </div>
    );
  }

  const { 
    month, 
    year, 
    period, 
    executiveSummary, 
    kpiDashboard, 
    risks, 
    recommendations,
    topProducts,
    topCustomers,
    inventory
  } = data;

  // Safeguard for missing data
  const safeExecutive = executiveSummary || { 
    totalRevenue: 0, 
    grossProfit: 0,
    grossMargin: 0,
    expenses: 0,
    netProfit: 0, 
    netMargin: 0, 
    revenueChange: 0, 
    profitChange: 0 
  };

  const safeKpi = kpiDashboard || { 
    grossMargin: 0, 
    netMargin: 0, 
    ytdRevenue: 0, 
    ytdNetProfit: 0,
    totalSales: 0,
    uniqueCustomers: 0
  };

  const safeInventory = inventory || { totalItems: 0, totalValue: 0, lowStockCount: 0 };

  // Display month name
  const monthName = month || new Date().toLocaleString('default', { month: 'long' });
  const yearDisplay = year || new Date().getFullYear();

  // Format period dates
  const startDate = period?.start ? new Date(period.start) : new Date();
  const endDate = period?.end ? new Date(period.end) : new Date();

  return (
    <div className="space-y-4">
      {/* Main Report Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Monthly Report
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {monthName} {yearDisplay} • {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </p>

        {/* Performance Metrics with Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(safeExecutive.totalRevenue)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Product Sales + Other Income</p>
          </div>

          {/* Gross Profit */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(safeExecutive.grossProfit || 0)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Product Sales – COGS • Margin: {formatPercentage(safeExecutive.grossMargin || 0)}
            </p>
          </div>

          {/* Expenses */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(safeExecutive.expenses || 0)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Operating expenses for the month</p>
          </div>

          {/* Net Profit */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(safeExecutive.netProfit)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Gross Profit – Expenses + Other Income • Margin: {formatPercentage(safeExecutive.netMargin || 0)}
            </p>
          </div>
        </div>

        {/* Month-over-Month Changes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">MoM Revenue</p>
            <p className={`text-xl font-bold ${safeExecutive.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {safeExecutive.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(safeExecutive.revenueChange || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">vs previous month</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">MoM Profit</p>
            <p className={`text-xl font-bold ${safeExecutive.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {safeExecutive.profitChange >= 0 ? '↑' : '↓'} {Math.abs(safeExecutive.profitChange || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">vs previous month</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">YTD Revenue</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(safeKpi.ytdRevenue)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Year-to-date revenue</p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">YTD Net Profit</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(safeKpi.ytdNetProfit)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Year-to-date profit</p>
          </div>
        </div>

        {/* KPI Dashboard */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">KPI Dashboard</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatPercentage(safeKpi.grossMargin)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Gross Profit / Revenue</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatPercentage(safeKpi.netMargin)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Net Profit / Revenue</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Sales</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {safeKpi.totalSales || 0}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Number of sales this month</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unique Customers</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {safeKpi.uniqueCustomers || 0}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Distinct customers this month</p>
            </div>
          </div>
        </div>

        {/* ✅ Inventory Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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
      </div>

      {/* Top 5 Products & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topProducts && topProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🏆 Top 5 Products</h4>
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">👥 Top 5 Customers</h4>
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

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">⚠️ Risks</h4>
          <div className="space-y-2">
            {risks.map((risk, idx) => (
              <div key={idx} className="text-sm text-red-600 dark:text-red-400 border-b border-gray-100 dark:border-gray-700 py-2">
                <span className="font-medium text-red-700 dark:text-red-300">• {risk.type}:</span> {risk.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📋 Recommendations</h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 py-2">
                • {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;