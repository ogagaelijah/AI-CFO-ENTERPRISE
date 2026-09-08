export default function KpiCard({ title, data, isPercent = false }) {
  if (!data || data.value == null) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-sm text-slate-400 mb-1">{title}</div>
        <div className="text-xl font-semibold text-slate-500">—</div>
      </div>
    );
  }

  const value = data.value;
  const direction = data.direction;
  const change = data.percentageChange;

  const formatted = isPercent
    ? `${Number(value).toFixed(1)}%`
    : new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(value);

  const directionColor =
    direction === 'UP' || direction === 'STRONG_UP'
      ? 'text-emerald-400'
      : direction === 'DOWN' || direction === 'STRONG_DOWN'
      ? 'text-rose-400'
      : 'text-slate-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
      <div className="text-sm text-slate-400 mb-1">{title}</div>
      <div className="text-xl font-semibold text-white">{formatted}</div>
      {change != null && (
        <div className={`text-xs mt-1 ${directionColor}`}>
          {change > 0 ? '+' : ''}
          {Number(change).toFixed(1)}%
          {direction && ` (${direction})`}
        </div>
      )}
    </div>
  );
}