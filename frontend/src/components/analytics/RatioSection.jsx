export default function RatioSection({ ratios = {} }) {
  const hasData =
    ratios.profitability ||
    ratios.liquidity ||
    ratios.efficiency ||
    ratios.workingCapital;

  if (!hasData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Financial Ratios</h3>
        <p className="text-slate-500 text-sm">No ratio data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Financial Ratios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RatioGroup title="Profitability" data={ratios.profitability} />
        <RatioGroup title="Liquidity" data={ratios.liquidity} />
        <RatioGroup title="Efficiency" data={ratios.efficiency} />
        <RatioGroup title="Working Capital" data={ratios.workingCapital} />
      </div>
    </div>
  );
}

function RatioGroup({ title, data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-slate-800/40 rounded-xl p-4">
        <div className="text-sm font-medium text-slate-300 mb-2">{title}</div>
        <div className="text-xs text-slate-500">No data</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 rounded-xl p-4">
      <div className="text-sm font-medium text-slate-300 mb-3">{title}</div>
      <div className="space-y-2">
        {Object.entries(data).slice(0, 5).map(([key, value]) => (
          <div key={key} className="flex justify-between text-xs">
            <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="text-white font-medium">
              {typeof value === 'number' ? value.toFixed(2) : value?.value?.toFixed?.(2) ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}