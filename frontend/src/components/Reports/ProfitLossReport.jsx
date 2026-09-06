// frontend/src/components/Reports/ProfitLossReport.jsx

const ProfitLossReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this period.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different period.</p>
      </div>
    );
  }

  const { 
    period,
    startDate,
    endDate,
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    netProfit,
  } = data;

  // Safeguards
  const safeRevenue = revenue || { productSales: 0, otherRevenue: 0, totalRevenue: 0 };
  const safeCogs = cogs || { total: 0 };
  const safeGrossProfit = grossProfit || { amount: 0, margin: 0 };
  const safeOperatingExpenses = operatingExpenses || { 
    salaries: 0, rent: 0, advertising: 0, 
    transportation: 0, utilities: 0, other: 0, total: 0 
  };
  const safeOperatingProfit = operatingProfit || { amount: 0, margin: 0 };
  const safeNetProfit = netProfit || { amount: 0, margin: 0 };

  // Format date range
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profit & Loss Statement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {period || 'Current Period'} • {start.toLocaleDateString()} - {end.toLocaleDateString()}
        </p>
      </div>

      <div className="p-6 space-y-3">
        {/* =============================================
            REVENUE
        ============================================= */}
        <div className="space-y-1">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Product Sales</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(safeRevenue.productSales)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Other Revenue</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(safeRevenue.otherRevenue)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
            <span className="text-gray-900 dark:text-white">Total Revenue</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(safeRevenue.totalRevenue)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Product Sales + Other Revenue</p>
        </div>

        {/* =============================================
            COGS
        ============================================= */}
        <div className="flex justify-between py-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Cost of Goods Sold (COGS)</span>
          <span className="text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(safeCogs.total)}</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Direct cost of products sold</p>

        {/* =============================================
            GROSS PROFIT
        ============================================= */}
        <div className="flex justify-between py-3 border-t-2 border-gray-300 dark:border-gray-600">
          <div>
            <span className="text-gray-900 dark:text-white font-semibold">Gross Profit</span>
            <p className="text-xs text-gray-400 dark:text-gray-500">Revenue – COGS</p>
          </div>
          <div className="text-right">
            <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(safeGrossProfit.amount)}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({formatPercentage(safeGrossProfit.margin)})</span>
          </div>
        </div>

        {/* =============================================
            OPERATING EXPENSES
        ============================================= */}
        <div className="space-y-1 pt-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Operating Expenses</p>
          <div className="ml-4 space-y-1">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Salaries</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.salaries)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Rent</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.rent)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Advertising</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.advertising)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Transportation</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.transportation)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Utilities</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.utilities)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Other</span>
              <span className="text-gray-600 dark:text-gray-400">{formatCurrency(safeOperatingExpenses.other)}</span>
            </div>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700 font-medium">
            <span className="text-gray-700 dark:text-gray-300">Total Operating Expenses</span>
            <span className="text-red-600 dark:text-red-400">{formatCurrency(safeOperatingExpenses.total)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Sum of all operating expenses</p>
        </div>

        {/* =============================================
            OPERATING PROFIT
        ============================================= */}
        <div className="flex justify-between py-3 border-t-2 border-gray-300 dark:border-gray-600">
          <div>
            <span className="text-gray-900 dark:text-white font-semibold">Operating Profit</span>
            <p className="text-xs text-gray-400 dark:text-gray-500">Gross Profit – Operating Expenses</p>
          </div>
          <div className="text-right">
            <span className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(safeOperatingProfit.amount)}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({formatPercentage(safeOperatingProfit.margin)})</span>
          </div>
        </div>

        {/* =============================================
            NET PROFIT
        ============================================= */}
        <div className="flex justify-between py-4 border-t-2 border-gray-400 dark:border-gray-500">
          <div>
            <span className="text-gray-900 dark:text-white font-bold text-lg">Net Profit</span>
            <p className="text-xs text-gray-400 dark:text-gray-500">Operating Profit + Other Income</p>
          </div>
          <div className="text-right">
            <span className={`font-bold text-lg ${safeNetProfit.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(safeNetProfit.amount)}
            </span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({formatPercentage(safeNetProfit.margin)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReport;