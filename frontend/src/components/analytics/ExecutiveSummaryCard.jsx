export default function ExecutiveSummaryCard({ executive }) {
  if (!executive) return null;

  const { keyMetrics = {}, performanceSummary = {}, healthSummary = {}, executiveSummary = {} } = executive;

  const formatMoney = (val) =>
    typeof val === 'number'
      ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val)
      : '—';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Executive Summary</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            {executiveSummary.narrative || 'No executive narrative available.'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-800 rounded-xl px-4 py-2 text-center">
            <div className="text-xs text-slate-400">Performance</div>
            <div className="text-xl font-bold text-white">{performanceSummary.score ?? '—'}</div>
            <div className="text-xs text-slate-400">{performanceSummary.status}</div>
          </div>
          <div className="bg-slate-800 rounded-xl px-4 py-2 text-center">
            <div className="text-xs text-slate-400">Health</div>
            <div className="text-xl font-bold text-white">{healthSummary.score ?? '—'}</div>
            <div className="text-xs text-slate-400">{healthSummary.status}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Metric label="Revenue" value={formatMoney(keyMetrics.revenue)} />
        <Metric label="Revenue Growth" value={`${keyMetrics.revenueGrowth ?? 0}%`} />
        <Metric label="Net Profit" value={formatMoney(keyMetrics.netProfit)} />
        <Metric label="Net Margin" value={`${keyMetrics.netMargin ?? 0}%`} />
        <Metric label="Gross Margin" value={`${keyMetrics.grossMargin ?? 0}%`} />
        <Metric label="Net Cash Flow" value={formatMoney(keyMetrics.netCashFlow)} />
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}