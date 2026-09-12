// frontend/src/components/common/PageHeader.jsx
// v1.0.0-prod — Reusable page header with back button

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PageHeader = ({
  title,
  subtitle = null,
  actions = null,        // optional JSX to render on the right (buttons)
  showBack = true,       // hide if you want a page without back button
  onBack = null,         // override default navigate(-1)
  backFallback = '/dashboard',  // where to go if there's no history
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();

    // If there's real history, go back; otherwise use fallback
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(backFallback);
    }
  };

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;