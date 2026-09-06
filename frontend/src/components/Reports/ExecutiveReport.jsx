// frontend/src/components/Reports/ExecutiveReport.jsx

const ExecutiveReport = ({ data, formatCurrency, formatPercentage }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data available for this period.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try selecting a different period.</p>
      </div>
    );
  }

  const {
    generatedAt,
    businessOverview,
    kpiSummary,
    businessTrends,
    forecast,
    profitability,
    cashFlow,
    risks,
    decisions,
    recommendations,
    aiAdvisor,
    period,
  } = data;

  // Safeguards
  const safeOverview = businessOverview || { revenue: 0, netProfit: 0, businessHealth: 'Neutral', businessScore: 0 };
  const safeKpi = kpiSummary || { grossMargin: 0, netMargin: 0, cashPosition: 0 };
  const safeTrends = businessTrends || { today: 0, thisWeek: 0, thisMonth: 0 };
  const safeForecast = forecast || { next7Days: 0, next30Days: 0, tomorrow: 0, confidence: 0 };
  const safeProfitability = profitability || { grossProfit: 0, netProfit: 0 };
  const safeCashFlow = cashFlow || { openingCash: 0, closingCash: 0, cashPosition: 0, netCashFlow: 0 };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getHealthColor = (health) => {
    if (!health) return 'text-gray-500';
    const h = health.toLowerCase();
    if (h.includes('good') || h.includes('excellent')) return 'text-green-600 dark:text-green-400';
    if (h.includes('critical') || h.includes('poor')) return 'text-red-600 dark:text-red-400';
    if (h.includes('warning') || h.includes('fair')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500';
  };

  const getHealthBg = (health) => {
    if (!health) return 'bg-gray-100 dark:bg-gray-700';
    const h = health.toLowerCase();
    if (h.includes('good') || h.includes('excellent')) return 'bg-green-100 dark:bg-green-900/30';
    if (h.includes('critical') || h.includes('poor')) return 'bg-red-100 dark:bg-red-900/30';
    if (h.includes('warning') || h.includes('fair')) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Executive Financial Report</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generated: {formatDate(generatedAt || new Date().toISOString())}
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthBg(safeOverview.businessHealth)} ${getHealthColor(safeOverview.businessHealth)}`}>
              {safeOverview.businessHealth || 'Neutral'}
            </span>
          </div>
        </div>
      </div>

      {/* Business Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Business Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(safeOverview.revenue)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Total revenue for the period</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className={`text-xl font-bold ${safeOverview.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(safeOverview.netProfit)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Revenue – all expenses</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Business Health</p>
            <p className={`text-xl font-bold ${getHealthColor(safeOverview.businessHealth)}`}>
              {safeOverview.businessHealth || 'Neutral'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Overall business condition</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Business Score</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{safeOverview.businessScore}/100</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Composite performance score</p>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">KPI Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPercentage(safeKpi.grossMargin)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Gross Profit / Revenue</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPercentage(safeKpi.netMargin)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Net Profit / Revenue</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cash Position</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(safeKpi.cashPosition)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Available cash balance</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Period</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {period?.start && period?.end 
                ? `${new Date(period.start).toLocaleDateString()} - ${new Date(period.end).toLocaleDateString()}`
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Report date range</p>
          </div>
        </div>
      </div>

      {/* Business Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Business Trends</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            <p className={`text-xl font-bold ${safeTrends.today >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {safeTrends.today >= 0 ? '↑' : '↓'} {Math.abs(safeTrends.today || 0).toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Change vs previous day</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
            <p className={`text-xl font-bold ${safeTrends.thisWeek >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {safeTrends.thisWeek >= 0 ? '↑' : '↓'} {Math.abs(safeTrends.thisWeek || 0).toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Change vs previous week</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
            <p className={`text-xl font-bold ${safeTrends.thisMonth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {safeTrends.thisMonth >= 0 ? '↑' : '↓'} {Math.abs(safeTrends.thisMonth || 0).toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Change vs previous month</p>
          </div>
        </div>
      </div>

      {/* Business Forecast */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Business Forecast</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Next 7 Days Revenue</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(safeForecast.next7Days)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Projected revenue for next 7 days</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Next 30 Days Revenue</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(safeForecast.next30Days)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Projected revenue for next 30 days</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tomorrow Revenue</p>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(safeForecast.tomorrow)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Projected revenue for tomorrow</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Forecast Confidence</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatPercentage(safeForecast.confidence)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Confidence level in forecast accuracy</p>
          </div>
        </div>
      </div>

      {/* Profitability & Cash Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profitability */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Profitability</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(safeProfitability.grossProfit)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Revenue – Cost of Goods Sold</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className={`text-xl font-bold ${safeProfitability.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(safeProfitability.netProfit)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Gross Profit – all expenses + other income</p>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Cash Flow</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Opening Cash</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(safeCashFlow.openingCash)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cash at start of period</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Closing Cash</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(safeCashFlow.closingCash)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cash at end of period</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cash Position</p>
              <p className={`text-xl font-bold ${safeCashFlow.cashPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {safeCashFlow.cashPosition >= 0 ? '+' : ''}{formatCurrency(safeCashFlow.cashPosition)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Net cash inflow/(outflow)</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Cash Flow</p>
              <p className={`text-xl font-bold ${safeCashFlow.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(safeCashFlow.netCashFlow)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cash In – Cash Out</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">⚠️ Risks</h3>
          <div className="space-y-3">
            {risks.map((risk, idx) => {
              const severityColor = risk.severity === 'Critical' ? 'text-red-600 dark:text-red-400' 
                : risk.severity === 'High' ? 'text-orange-600 dark:text-orange-400'
                : risk.severity === 'Medium' ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400';
              return (
                <div key={idx} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{risk.title || 'Risk'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor} bg-opacity-10`}>
                      {risk.severity || 'Info'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{risk.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decisions */}
      {decisions && decisions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Decisions</h3>
          <div className="space-y-2">
            {decisions.map((decision, idx) => {
              const priorityColor = decision.priority === 'Immediate' || decision.priority === 'Critical' ? 'text-red-600 dark:text-red-400'
                : decision.priority === 'High' ? 'text-orange-600 dark:text-orange-400'
                : decision.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400';
              return (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{decision.title}</span>
                    <span className={`text-xs ml-2 ${priorityColor}`}>({decision.priority || 'Info'})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${priorityColor}`}>{decision.severity || 'Info'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Score: {decision.score || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">📋 Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => {
              const priorityColor = rec.priority === 'Immediate' || rec.priority === 'Critical' ? 'text-red-600 dark:text-red-400'
                : rec.priority === 'High' ? 'text-orange-600 dark:text-orange-400'
                : rec.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400';
              return (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rec.title}</span>
                  <span className={`text-xs font-medium ${priorityColor}`}>({rec.priority || 'Info'})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI CFO Advisor */}
      {aiAdvisor && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">🤖 AI CFO Advisor</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Business Status</p>
              <p className={`text-xl font-bold ${aiAdvisor.status === 'Critical' ? 'text-red-600 dark:text-red-400' : aiAdvisor.status === 'Good' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {aiAdvisor.status || 'Neutral'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">AI-powered business assessment</p>
            </div>
            {aiAdvisor.overallPriority && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overall Priority</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{aiAdvisor.overallPriority}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Recommended focus area</p>
              </div>
            )}
            {aiAdvisor.summary && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{aiAdvisor.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveReport;