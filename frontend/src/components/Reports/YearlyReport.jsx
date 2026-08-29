// frontend/src/components/Reports/YearlyReport.jsx

const YearlyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { executiveSummary, annualKpiDashboard, yearOverYear, majorRisks, majorOpportunities, strategicInsights } = data;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Yearly Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Year {data.year}</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(executiveSummary?.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(executiveSummary?.netProfit)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Margin: {formatPercentage(executiveSummary?.netMargin)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">YoY Revenue</p>
            <p className={`text-xl font-bold ${yearOverYear?.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {yearOverYear?.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(yearOverYear?.revenueChange || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">YoY Profit</p>
            <p className={`text-xl font-bold ${yearOverYear?.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {yearOverYear?.profitChange >= 0 ? '↑' : '↓'} {Math.abs(yearOverYear?.profitChange || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {annualKpiDashboard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Annual KPIs</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(annualKpiDashboard.grossMargin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(annualKpiDashboard.netMargin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total COGS</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(annualKpiDashboard.cogs)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(annualKpiDashboard.expenses)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategic Insights */}
      {strategicInsights && strategicInsights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📊 Strategic Insights</h4>
          <div className="space-y-1">
            {strategicInsights.map((insight, idx) => (
              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 py-1">
                • {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Major Risks & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {majorRisks && majorRisks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">⚠️ Major Risks</h4>
            <div className="space-y-1">
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
            <div className="space-y-1">
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