export default function PerformanceScore({ performance }) {
  if (!performance) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Performance Score</h3>
        <p className="text-slate-500 text-sm">No performance data available</p>
      </div>
    );
  }

  const { score = 50, status = 'NEUTRAL', narrative } = performance;

  const statusColor =
    status === 'EXCELLENT' || status === 'GOOD'
      ? 'text-emerald-400'
      : status === 'CRITICAL'
      ? 'text-rose-400'
      : 'text-amber-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Performance Score</h3>
      <div className="flex items-end gap-4 mb-4">
        <div className="text-5xl font-bold text-white">{score}</div>
        <div className={`text-lg font-medium ${statusColor}`}>{status}</div>
      </div>
      {narrative && <p className="text-sm text-slate-400">{narrative}</p>}
    </div>
  );
}