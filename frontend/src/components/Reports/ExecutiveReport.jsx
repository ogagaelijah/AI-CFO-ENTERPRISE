// frontend/src/components/Reports/ExecutiveReport.jsx
import { AlertCircle } from 'lucide-react';

const ExecutiveReport = ({ data, formatCurrency, formatPercentage }) => {
  const { executiveSummary, kpiDashboard, risks, insights, recommendations } = data;

  if (!data) return <p className="text-gray-500 dark:text-gray-400">No data available</p>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(executiveSummary?.revenue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(executiveSummary?.grossProfit)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Margin: {formatPercentage(executiveSummary?.grossMargin)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(executiveSummary?.netProfit)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Margin: {formatPercentage(executiveSummary?.netMargin)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(executiveSummary?.expenses)}</p>
        </div>
      </div>

      {/* KPI Dashboard */}
      {kpiDashboard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">KPI Dashboard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(kpiDashboard.revenue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gross Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(kpiDashboard.grossMargin)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Margin</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPercentage(kpiDashboard.netMargin)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{kpiDashboard.totalSales || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">⚠️ Risks & Alerts</h3>
          <div className="space-y-2">
            {risks.map((risk, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{risk.category} - {risk.severity}</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{risk.description}</p>
                  {risk.action && (
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">→ {risk.action}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 AI Insights</h3>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                insight.type === 'POSITIVE' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
              }`}>
                <p className="text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    rec.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' :
                    rec.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' :
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  }`}>
                    {rec.priority || 'MEDIUM'} PRIORITY
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{rec.timeframe}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">{rec.issue}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">→ {rec.action}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Expected Impact: {rec.expectedImpact}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveReport;