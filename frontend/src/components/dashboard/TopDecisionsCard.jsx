// frontend/src/components/dashboard/TopDecisionsCard.jsx
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';

const PRIORITY_STYLES = {
  CRITICAL: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  HIGH: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  MEDIUM: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  LOW: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

const PRIORITY_LABELS = {
  CRITICAL: '🔴 Critical',
  HIGH: '🟠 High',
  MEDIUM: '🟡 Medium',
  LOW: '🟢 Low',
};

const TopDecisionsCard = ({ decisions = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          Top Decisions
        </h3>
        <Link
          to="/decisions"
          className="text-xs text-primary-600 dark:text-gold-400 hover:underline"
        >
          View all →
        </Link>
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No decisions require attention
        </p>
      ) : (
        <div className="space-y-3">
          {decisions.slice(0, 3).map((decision, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${PRIORITY_STYLES[decision.priority] || PRIORITY_STYLES.LOW}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1 text-gray-900 dark:text-white">
                  {decision.title}
                </p>
                <span className="text-xs font-medium whitespace-nowrap">
                  {PRIORITY_LABELS[decision.priority] || decision.priority}
                </span>
              </div>
              {decision.recommendation && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {decision.recommendation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopDecisionsCard;