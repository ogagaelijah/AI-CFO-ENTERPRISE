// frontend/src/pages/reports/ExecutiveReport.jsx

const formatCurrency = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

const ExecutiveReport = ({ data }) => {
  const { 
    metadata, 
    executiveSummary, 
    kpiDashboard, 
    revenueSales, 
    profitability, 
    expenses, 
    cashFlow, 
    receivables, 
    payables, 
    inventory, 
    financialRatios, 
    trends, 
    forecast, 
    risks, 
    aiInsights, 
    recommendations, 
    actionPlan 
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">📊 Executive Summary</h2>
        <p className="text-primary-100 mt-1">Period: {metadata.period} — Generated: {new Date(metadata.generatedAt).toLocaleDateString()}</p>
      </div>

      {/* 1. Executive Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Business Health</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{executiveSummary.businessHealth}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Top Achievement</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{executiveSummary.topAchievement}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Top Risk</p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{executiveSummary.topRisk}</p>
          </div>
        </div>
      </div>

      {/* 2. KPI Dashboard */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. KPI Dashboard</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(kpiDashboard.revenue.current)}</p>
            <p className={`text-xs ${kpiDashboard.revenue.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpiDashboard.revenue.change >= 0 ? '↑' : '↓'} {Math.abs(kpiDashboard.revenue.change).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(kpiDashboard.grossProfit.current)}</p>
            <p className={`text-xs ${kpiDashboard.grossProfit.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpiDashboard.grossProfit.change >= 0 ? '↑' : '↓'} {Math.abs(kpiDashboard.grossProfit.change).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(kpiDashboard.netProfit.current)}</p>
            <p className={`text-xs ${kpiDashboard.netProfit.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpiDashboard.netProfit.change >= 0 ? '↑' : '↓'} {Math.abs(kpiDashboard.netProfit.change).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{kpiDashboard.grossMargin}%</p>
          </div>
        </div>
      </div>

      {/* 3. Revenue & Sales */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. Revenue & Sales Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-lg font-bold text-primary-600 dark:text-gold-400">{formatCurrency(revenueSales.total)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sales</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(revenueSales.sales)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Growth</p>
            <p className={`text-lg font-bold ${revenueSales.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {revenueSales.growth >= 0 ? '↑' : '↓'} {Math.abs(revenueSales.growth).toFixed(1)}%
            </p>
          </div>
        </div>
        {revenueSales.topProducts && revenueSales.topProducts.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Products</p>
            <div className="space-y-1">
              {revenueSales.topProducts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-gray-100 dark:border-slate-700 py-1">
                  <span className="text-gray-600 dark:text-gray-400">{i+1}. {p.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Profitability */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Profitability Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(profitability.grossProfit)}</p>
            <p className="text-xs text-gray-400">Margin: {profitability.grossMargin}%</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Operating Profit</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(profitability.operatingProfit)}</p>
            <p className="text-xs text-gray-400">Margin: {profitability.operatingMargin}%</p>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(profitability.netProfit)}</p>
            <p className="text-xs text-gray-400">Margin: {profitability.netMargin}%</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">vs Previous</p>
            <p className={`text-sm font-bold ${profitability.comparison.grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {profitability.comparison.grossProfit >= 0 ? '↑' : '↓'} {Math.abs(profitability.comparison.grossProfit).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400">Gross Profit</p>
          </div>
        </div>
      </div>

      {/* 5. Expenses */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Expense Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(expenses.total)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">vs Previous</p>
            <p className={`text-lg font-bold ${expenses.comparison <= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {expenses.comparison <= 0 ? '↓' : '↑'} {Math.abs(expenses.comparison).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* 6. Cash Flow */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. Cash Flow & Liquidity</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Inflows</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(cashFlow.inflows)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Outflows</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(cashFlow.outflows)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net</p>
            <p className={`text-sm font-bold ${cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow.net)}
            </p>
          </div>
        </div>
      </div>

      {/* 7-8. Receivables & Payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">7. Receivables / Debtors</h3>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(receivables.total)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{receivables.count} active debtors</p>
          <p className="text-xs text-red-500">Overdue: {formatCurrency(receivables.overdue)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">8. Payables / Creditors</h3>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(payables.total)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{payables.count} active creditors</p>
          <p className="text-xs text-red-500">Overdue: {formatCurrency(payables.overdue)}</p>
        </div>
      </div>

      {/* 9. Inventory */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">9. Inventory & Working Capital</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inventory.totalValue)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{inventory.totalItems}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock</p>
            <p className={`text-sm font-bold ${inventory.lowStock > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {inventory.lowStock}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Turnover</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{inventory.turnover.toFixed(2)}x</p>
          </div>
        </div>
        {inventory.lowStock > 0 && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ Low stock alert: {inventory.lowStock} items need reordering</p>
          </div>
        )}
      </div>

      {/* 10. Financial Ratios */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">10. Financial Ratios</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Margin</p>
            <p className="text-sm font-bold text-green-600">{financialRatios.grossMargin}%</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Margin</p>
            <p className="text-sm font-bold text-purple-600">{financialRatios.netMargin}%</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current Ratio</p>
            <p className="text-sm font-bold text-blue-600">{financialRatios.currentRatio}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Quick Ratio</p>
            <p className="text-sm font-bold text-cyan-600">{financialRatios.quickRatio}</p>
          </div>
        </div>
      </div>

      {/* 11. Trends */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">11. Financial Trends</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Direction: <span className="font-bold">{trends.summary.direction}</span> ({trends.summary.growth}% growth)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {trends.data && trends.data.map((t, i) => (
            <div key={i} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.month}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(t.revenue)}</p>
              <p className="text-xs text-green-600 dark:text-green-400">{formatCurrency(t.netProfit)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 12. Forecast */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">12. Forecast & Outlook</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Next Month Revenue</p>
            <p className="text-lg font-bold text-primary-600 dark:text-gold-400">{formatCurrency(forecast.nextMonthRevenue)}</p>
            <p className="text-xs text-gray-500">Confidence: {forecast.confidence}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Key Factors</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
              {forecast.factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* 13. Risks */}
      {risks.items && risks.items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">13. Risks & Alerts</h3>
          {risks.items.map((r, i) => (
            <div key={i} className={`p-3 rounded-lg mb-2 border ${r.severity === 'High' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
              <p className="text-sm font-medium">{r.type}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
              <p className={`text-xs font-bold ${r.severity === 'High' ? 'text-red-500' : 'text-yellow-500'}`}>Severity: {r.severity}</p>
            </div>
          ))}
        </div>
      )}

      {/* 14. AI Insights */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-bold mb-3">14. AI CFO Insights</h3>
        <ul className="space-y-2">
          {aiInsights && aiInsights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-purple-200">•</span>
              <span className="text-sm">{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 15. Strategic Recommendations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">15. Strategic Recommendations</h3>
        {recommendations && recommendations.length > 0 ? (
          <ul className="space-y-2">
            {recommendations.map((rec, i) => {
              // Parse recommendation with [Category] format
              const hasCategory = rec.includes('[') && rec.includes(']');
              const category = hasCategory ? rec.substring(rec.indexOf('['), rec.indexOf(']') + 1) : `[${i + 1}]`;
              const text = hasCategory ? rec.substring(rec.indexOf(']') + 1).trim() : rec;
              
              // Determine color based on category
              let bgColor = 'bg-gray-50 dark:bg-slate-700';
              let borderColor = 'border-gray-200 dark:border-slate-600';
              if (category.includes('Pricing') || category.includes('Growth')) {
                bgColor = 'bg-blue-50 dark:bg-blue-900/20';
                borderColor = 'border-blue-200 dark:border-blue-800';
              } else if (category.includes('Collections') || category.includes('Expenses')) {
                bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                borderColor = 'border-yellow-200 dark:border-yellow-800';
              } else if (category.includes('Inventory')) {
                bgColor = 'bg-red-50 dark:bg-red-900/20';
                borderColor = 'border-red-200 dark:border-red-800';
              } else if (category.includes('Success')) {
                bgColor = 'bg-green-50 dark:bg-green-900/20';
                borderColor = 'border-green-200 dark:border-green-800';
              }
              
              return (
                <li key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${bgColor} ${borderColor}`}>
                  <span className="text-xs font-bold text-primary-600 dark:text-gold-400 min-w-[80px] uppercase">
                    {category}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No recommendations available</p>
        )}
      </div>

      {/* 16. Action Plan */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">16. Management Action Plan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700">
                <th className="text-left p-2 text-gray-600 dark:text-gray-300">Action</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-300">Priority</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-300">Timeline</th>
                <th className="text-left p-2 text-gray-600 dark:text-gray-300">Owner</th>
              </tr>
            </thead>
            <tbody>
              {actionPlan && actionPlan.map((item, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                  <td className="p-2 text-gray-700 dark:text-gray-300">{item.action}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${item.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{item.timeline}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400">{item.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveReport;