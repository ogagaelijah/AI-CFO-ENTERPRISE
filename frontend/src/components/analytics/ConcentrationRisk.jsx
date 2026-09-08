export default function ConcentrationRisk({ concentration }) {
  if (!concentration) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Concentration Risk</h3>
        <p className="text-slate-500 text-sm">No concentration data available</p>
      </div>
    );
  }

  const { overallRiskLevel = 'LOW', summary, products, customers, suppliers, expenseCategories } =
    concentration;

  const riskColor =
    overallRiskLevel === 'CRITICAL'
      ? 'text-rose-400'
      : overallRiskLevel === 'HIGH'
      ? 'text-orange-400'
      : overallRiskLevel === 'MODERATE'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Concentration Risk</h3>
        <div className={`text-sm font-semibold ${riskColor}`}>{overallRiskLevel}</div>
      </div>
      <p className="text-sm text-slate-400 mb-6">{summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SegmentCard title="Products" data={products} />
        <SegmentCard title="Customers" data={customers} />
        <SegmentCard title="Suppliers" data={suppliers} />
        <SegmentCard title="Expense Categories" data={expenseCategories} />
      </div>
    </div>
  );
}

function SegmentCard({ title, data = {} }) {
  const risk = data.riskLevel || 'LOW';
  const color =
    risk === 'CRITICAL' || risk === 'HIGH'
      ? 'text-rose-400'
      : risk === 'MODERATE'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="text-sm font-medium text-slate-300 mb-1">{title}</div>
      <div className={`text-lg font-semibold ${color}`}>{risk}</div>
      <div className="text-xs text-slate-500 mt-1">
        Top {data.topCount || 0} = {data.topPercentage || 0}%
      </div>
    </div>
  );
}