// frontend/src/components/dashboard/TopRisksCard.jsx
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  HIGH: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  MEDIUM: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  LOW: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
};

const TopRisksCard = ({ risks = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Top Risks
        </h3>
        <Link
          to="/risk"
          className="text-xs text-primary-600 dark:text-gold-400 hover:underline"
        >
          View all →
        </Link>
      </div>

      {risks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ✅ No critical risks detected
        </p>
      ) : (
        <div className="space-y-3">
          {risks.map((risk, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.LOW}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{risk.title}</p>
                <span className="text-xs font-bold whitespace-nowrap">
                  {risk.severity}
                </span>
              </div>
              {risk.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {risk.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopRisksCard;