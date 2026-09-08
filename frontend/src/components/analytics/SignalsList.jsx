export default function SignalsList({ signals = {} }) {
  const { positives = [], warnings = [], criticals = [] } = signals;

  if (positives.length === 0 && warnings.length === 0 && criticals.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Signals & Alerts</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SignalColumn title="Positives" items={positives} color="emerald" />
        <SignalColumn title="Warnings" items={warnings} color="amber" />
        <SignalColumn title="Criticals" items={criticals} color="rose" />
      </div>
    </div>
  );
}

function SignalColumn({ title, items, color }) {
  const colorMap = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  };

  return (
    <div>
      <div className="text-sm font-medium text-slate-300 mb-2">
        {title} ({items.length})
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-xs text-slate-500">None</div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg border px-3 py-2 ${colorMap[color]}`}
            >
              {item.message || item.metric || JSON.stringify(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}