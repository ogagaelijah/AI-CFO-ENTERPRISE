export default function HealthScore({ health }) {
  if (!health) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Business Health</h3>
        <p className="text-slate-500 text-sm">No health data available</p>
      </div>
    );
  }

  const { score = 50, status = 'NEUTRAL', description, recommendations = [] } = health;

  const statusColor =
    status === 'EXCELLENT' || status === 'GOOD'
      ? 'text-emerald-400'
      : status === 'CRITICAL'
      ? 'text-rose-400'
      : 'text-amber-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Business Health</h3>
      <div className="flex items-end gap-4 mb-4">
        <div className="text-5xl font-bold text-white">{score}</div>
        <div className={`text-lg font-medium ${statusColor}`}>{status}</div>
      </div>
      {description && <p className="text-sm text-slate-400 mb-3">{description}</p>}
      {recommendations.length > 0 && (
        <ul className="text-sm text-slate-300 space-y-1">
          {recommendations.slice(0, 3).map((rec, i) => (
            <li key={i}>• {typeof rec === 'string' ? rec : rec.message || JSON.stringify(rec)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}