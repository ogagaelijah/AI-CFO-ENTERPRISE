// frontend/src/components/Reports/YearlyReport.jsx

const YearlyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this year.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different year.</p>
      </div>
    );
  }

  const { 
    year,
    period,
    executiveSummary,
    annualKpiDashboard,
    yearOverYear,
    majorRisks,
    majorOpportunities,
    strategicInsights,
    inventory,
  } = data;

  // Safeguard for missing data
  const safeExecutive = executiveSummary || { 
    totalRevenue: 0, 
    netProfit: 0, 
    netMargin: 0 
  };

  const safeKpi = annualKpiDashboard || { 
    grossMargin: 0, 
    netMargin: 0, 
    cogs: 0, 
    expenses: 0,
    grossProfit: 0,
  };

  const safeYoY = yearOverYear || { 
    revenueChange: 0, 
    profitChange: 0,
    revenueAbsoluteChange: 0,
    profitAbsoluteChange: 0,
    hasPriorYearData: false,
    previousYear: { revenue: 0, netProfit: 0 },
  };

  const safeInventory = inventory || { 
    totalItems: 0, 
    totalValue: 0, 
    lowStockCount: 0 
  };

  const yearDisplay = year || new Date().getFullYear();
  const hasPriorYearData = safeYoY.hasPriorYearData;

  // Format period dates
  const startDate = period?.start ? new Date(period.start) : new Date();
  const endDate = period?.end ? new Date(period.end) : new Date();

  return (
    <div className="space-y-4">
      {/* Main Report Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Yearly Report
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {yearDisplay} • {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </p>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(safeExecutive.totalRevenue)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Total annual revenue</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(safeKpi.grossProfit || 0)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Revenue – COGS • Margin: {formatPercentage(safeKpi.grossMargin)}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(safeKpi.expenses)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Total annual operating expenses</p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(safeExecutive.netProfit)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Gross Profit – Expenses • Margin: {formatPercentage(safeExecutive.netMargin)}
            </p>
          </div>
        </div>

        {/* Year-over-Year + Inventory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* YoY Revenue */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">YoY Revenue</p>
            {hasPriorYearData ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className={`text-xl font-bold ${safeYoY.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {safeYoY.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(safeYoY.revenueChange || 0).toFixed(1)}%
                  </p>
                  <p className={`text-sm font-medium ${safeYoY.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {safeYoY.revenueAbsoluteChange >= 0 ? '+' : '-'} {formatCurrency(Math.abs(safeYoY.revenueAbsoluteChange || 0))}
                  </p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">vs previous year</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(safeExecutive.totalRevenue)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">📊 First year tracked — baseline established</p>
              </>
            )}
          </div>

          {/* YoY Profit */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">YoY Profit</p>
            {hasPriorYearData ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className={`text-xl font-bold ${safeYoY.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {safeYoY.profitChange >= 0 ? '↑' : '↓'} {Math.abs(safeYoY.profitChange || 0).toFixed(1)}%
                  </p>
                  <p className={`text-sm font-medium ${safeYoY.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {safeYoY.profitAbsoluteChange >= 0 ? '+' : '-'} {formatCurrency(Math.abs(safeYoY.profitAbsoluteChange || 0))}
                  </p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">vs previous year</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(safeExecutive.netProfit)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">📊 First year tracked — baseline established</p>
              </>
            )}
          </div>

          {/* Total COGS */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total COGS</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(safeKpi.cogs)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Cost of goods sold</p>
          </div>

          {/* Net Margin */}
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {formatPercentage(safeKpi.netMargin)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Net Profit / Revenue</p>
          </div>
        </div>

        {/* Inventory Section */}
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

        {/* Strategic Insights */}
        {strategicInsights && strategicInsights.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📊 Strategic Insights</h4>
            <div className="space-y-1">
              {strategicInsights.map((insight, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 py-1">
                  • {insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Major Risks & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {majorRisks && majorRisks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">⚠️ Major Risks</h4>
            <div className="space-y-2">
              {majorRisks.map((risk, idx) => (
                <div key={idx} className="text-sm text-red-600 dark:text-red-400 border-b border-gray-100 dark:border-gray-700 py-1">
                  • {risk}
                </div>
              ))}
            </div>
          </div>
        )}

        {majorOpportunities && majorOpportunities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">🚀 Major Opportunities</h4>
            <div className="space-y-2">
              {majorOpportunities.map((opp, idx) => (
                <div key={idx} className="text-sm text-green-600 dark:text-green-400 border-b border-gray-100 dark:border-gray-700 py-1">
                  • {opp}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearlyReport;