export default function ForecastHeader({ generatedAt }) {
  const formatted = generatedAt
    ? new Date(generatedAt).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Forecast</h1>
      <p className="text-slate-400 text-sm mt-1">
        Forward-looking projections powered by Analytics SSOT
        {formatted && ` • Generated ${formatted}`}
      </p>
    </div>
  );
}