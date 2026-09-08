export default function AnalyticsHeader({ generatedAt }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Analytics</h1>
      <p className="text-slate-400 text-sm mt-1">
        Understand your business performance with KPIs, ratios, and trends
      </p>
      {generatedAt && (
        <p className="text-xs text-slate-500 mt-1">
          Last updated: {new Date(generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}