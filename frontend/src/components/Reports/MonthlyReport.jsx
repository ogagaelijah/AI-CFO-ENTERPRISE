// frontend/src/components/Reports/MonthlyReport.jsx

const MonthlyReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  const { executiveSummary, kpiDashboard, risks, aiInsights, recommendations } = data;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monthly Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {data.month} {data.year} • {new Date(data.period?.start).toLocaleDateString()} - {new Date(data.period?.end).toLocaleDateString()}
        </p>
        
        {/* Executive Summary */}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">MoM Revenue</p>
            <p className={`text-xl font-bold ${executiveSummary?.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {executiveSummary?.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(executiveSummary?.revenueChange || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">MoM Profit</p>
            <p className={`text-xl font-bold ${executiveSummary?.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {executiveSummary?.profitChange >= 0 ? '↑' : '↓'} {Math.abs(executiveSummary?.profitChange || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      {kpiDashboard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">KPI Dashboard</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(kpiDashboard.grossMargin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(kpiDashboard.netMargin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">YTD Revenue</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(kpiDashboard.ytdRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">YTD Net Profit</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(kpiDashboard.ytdNetProfit)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">⚠️ Risks</h4>
          <div className="space-y-1">
            {risks.map((risk, idx) => (
              <div key={idx} className="text-sm text-red-600 dark:text-red-400 border-b border-gray-100 dark:border-gray-700 py-1">
                {risk.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {aiInsights && aiInsights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">💡 AI Insights</h4>
          <div className="space-y-1">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 py-1">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📋 Recommendations</h4>
          <div className="space-y-1">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 py-1">
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