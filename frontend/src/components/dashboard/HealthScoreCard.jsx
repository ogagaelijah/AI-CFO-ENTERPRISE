// frontend/src/components/dashboard/HealthScoreCard.jsx
const HealthScoreCard = ({ healthScore }) => {
  const score = healthScore?.score || 0;
  const status = healthScore?.status || 'NEUTRAL';

  const statusStyles = {
    EXCELLENT: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    GOOD: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    NEUTRAL: { bg: 'bg-gray-50 dark:bg-slate-700', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-slate-600' },
    CRITICAL: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  };

  const style = statusStyles[status] || statusStyles.NEUTRAL;

  const getBarColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`rounded-xl border p-4 sm:p-6 ${style.bg} ${style.border}`}>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        Business Health Score
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {score}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className={`text-xs font-medium mt-2 ${style.text}`}>{status}</p>
    </div>
  );
};

export default HealthScoreCard;