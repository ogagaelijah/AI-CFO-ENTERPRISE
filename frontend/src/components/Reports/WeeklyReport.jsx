// frontend/src/components/Reports/WeeklyReport.jsx

const WeeklyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { revenue, grossProfit, grossMargin, netProfit, netMargin, expenses, topProducts, topCustomers } = data;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {new Date(data.period?.start).toLocaleDateString()} - {new Date(data.period?.end).toLocaleDateString()}
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(grossProfit)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Margin: {formatPercentage(grossMargin)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(netProfit)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Margin: {formatPercentage(netMargin)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(expenses)}</p>
          </div>
        </div>

        {data.weekOverWeek && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Week-over-Week</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`text-sm ${data.weekOverWeek.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Revenue: {data.weekOverWeek.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(data.weekOverWeek.revenueChange).toFixed(1)}%
              </span>
              <span className={`text-sm ${data.weekOverWeek.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Profit: {data.weekOverWeek.profitChange >= 0 ? '↑' : '↓'} {Math.abs(data.weekOverWeek.profitChange).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Products & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topProducts && topProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Products</h4>
            <div className="space-y-1">
              {topProducts.map((p, idx) => (
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Customers</h4>
            <div className="space-y-1">
              {topCustomers.map((c, idx) => (
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