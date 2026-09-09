export default function BaseForecastCards({ baseForecast }) {
  if (!baseForecast?.metrics?.length) return null;

  const formatValue = (val, format) => {
    if (typeof val !== 'number') return '—';
    if (format === 'money') {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return new Intl.NumberFormat('en-NG').format(val);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Base Forecast</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {baseForecast.metrics.map((m) => (
          <div
            key={m.key}
            className={`bg-slate-900 border rounded-2xl p-4 ${
              m.available ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
            }`}
          >
            <div className="text-xs text-slate-400 mb-1">{m.label}</div>
            <div className="text-lg font-bold text-white">
              {m.available ? formatValue(m.forecast, m.format) : 'N/A'}
            </div>
            {!m.available && m.reason && (
              <div className="text-xs text-amber-500 mt-1">{m.reason}</div>
            )}
            {m.confidence != null && (
              <div className="text-xs text-slate-500 mt-1">Confidence: {m.confidence}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}