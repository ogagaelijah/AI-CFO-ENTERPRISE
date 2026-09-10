// frontend/src/components/dashboard/QuickActions.jsx
import { Link } from 'react-router-dom';

const QuickActions = ({ industryConfig }) => {
  if (!industryConfig?.quickActions || industryConfig.quickActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
        Quick Actions for {industryConfig.label}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {industryConfig.quickActions.map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <Link
              key={index}
              to={action.href}
              className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
            >
              <ActionIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-gold-400 mb-1 sm:mb-2" />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;