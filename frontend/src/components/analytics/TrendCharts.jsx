export default function TrendCharts({ trends = {} }) {
  const available = ['revenue', 'expenses', 'profit', 'cashFlow'].filter(
    (key) => trends[key]?.data?.length > 0
  );

  if (available.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Trends</h3>
        <p className="text-slate-500 text-sm">No trend data available for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trends</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {available.map((key) => {
          const t = trends[key];
          return (
            <div key={key} className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-white capitalize">{t.displayName || key}</div>
                <div className="text-sm text-slate-400">
                  {t.direction} {t.percentageChange != null ? `(${t.percentageChange.toFixed(1)}%)` : ''}
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Current: {formatValue(t.current)} | Previous: {formatValue(t.previous)}
              </div>
              {/* Simple sparkline substitute – replace with real chart lib later */}
              <div className="flex items-end gap-1 h-16">
                {t.data.slice(-8).map((point, i) => {
                  const max = Math.max(...t.data.map((d) => d.value || 0), 1);
                  const height = Math.max(4, ((point.value || 0) / max) * 100);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500/70 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${point.period}: ${point.value}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(val);
}