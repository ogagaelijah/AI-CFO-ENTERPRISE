// frontend/src/components/Reports/DailyReport.jsx

const DailyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { today, comparison, transactions, alerts } = data;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Report - {new Date(data.date).toLocaleDateString()}</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(today?.revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(today?.grossProfit)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Margin: {formatPercentage(today?.grossMargin)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(today?.netProfit)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(today?.expenses)}</p>
          </div>
        </div>

        {comparison && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">vs Previous Day</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`text-sm ${comparison.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Revenue: {comparison.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(comparison.revenueChange).toFixed(1)}%
              </span>
              <span className={`text-sm ${comparison.netProfitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Profit: {comparison.netProfitChange >= 0 ? '↑' : '↓'} {Math.abs(comparison.netProfitChange).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {alerts?.lowStock && alerts.lowStock.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ {alerts.lowStock.length} items below reorder level</p>
          </div>
        )}
      </div>

      {transactions && transactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Key Transactions</h4>
          <div className="space-y-1">
            {transactions.slice(0, 5).map((t, idx) => (
              <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 py-1">
                <span className="text-gray-600 dark:text-gray-400">{t.type}: {t.description}</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReport;