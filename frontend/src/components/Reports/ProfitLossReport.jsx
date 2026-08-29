// frontend/src/components/Reports/ProfitLossReport.jsx

const ProfitLossReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { revenue, cogs, grossProfit, operatingExpenses, operatingProfit, netProfit } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-3xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profit & Loss Statement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data.period} • {new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}
        </p>
      </div>

      <div className="p-6 space-y-3 font-mono text-sm">
        {/* REVENUE */}
        <div className="space-y-1">
          <div className="flex justify-between py-1">
            <span className="text-gray-600 dark:text-gray-400">Product Sales</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(revenue?.productSales)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600 dark:text-gray-400">Other Revenue</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(revenue?.otherRevenue)}</span>
          </div>
          <div className="flex justify-between py-1 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
            <span className="text-gray-900 dark:text-white">Total Revenue</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(revenue?.totalRevenue)}</span>
          </div>
        </div>

        {/* COGS */}
        <div className="flex justify-between py-1 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">COGS</span>
          <span className="text-orange-600 dark:text-orange-400">{formatCurrency(cogs?.total)}</span>
        </div>

        {/* GROSS PROFIT */}
        <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
          <span className="text-gray-900 dark:text-white">Gross Profit</span>
          <div className="text-right">
            <span className="text-green-600 dark:text-green-400">{formatCurrency(grossProfit?.amount)}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({formatPercentage(grossProfit?.margin)})</span>
          </div>
        </div>

        {/* OPERATING EXPENSES */}
        <div className="space-y-1 pt-2">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Salaries</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.salaries)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Rent</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.rent)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Advertising</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.advertising)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Transportation</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.transportation)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Utilities</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.utilities)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400 ml-4">Other</span>
            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(operatingExpenses?.other)}</span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-200 dark:border-gray-700 font-medium">
            <span className="text-gray-700 dark:text-gray-300">Total Operating Expenses</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(operatingExpenses?.total)}</span>
          </div>
        </div>

        {/* OPERATING PROFIT */}
        <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
          <span className="text-gray-900 dark:text-white">Operating Profit</span>
          <div className="text-right">
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(operatingProfit?.amount)}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({formatPercentage(operatingProfit?.margin)})</span>
          </div>
        </div>

        {/* NET PROFIT */}
        <div className="flex justify-between py-3 border-t-2 border-gray-400 dark:border-gray-500 font-bold text-lg">
          <span className="text-gray-900 dark:text-white">Net Profit</span>
          <div className="text-right">
            <span className="text-green-600 dark:text-green-400">{formatCurrency(netProfit?.amount)}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({formatPercentage(netProfit?.margin)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReport;