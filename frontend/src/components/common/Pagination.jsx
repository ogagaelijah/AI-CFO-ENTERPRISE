// frontend/src/components/common/Pagination.jsx
// v1.0.0-prod — Prev / Page X of Y / Next. Hides when only one page.
//               Matches the app's primary + gold design tokens.

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @param {Object} props
 * @param {{ page:number, limit:number, total:number, totalPages:number, hasNext:boolean, hasPrev:boolean }} props.pagination
 * @param {(page:number) => void} props.onPageChange
 * @param {boolean} [props.showCount] - show "Showing X–Y of Z" line (default true)
 */
const Pagination = ({ pagination, onPageChange, showCount = true }) => {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) {
    // Even with 1 page, show the count line if requested and there is data.
    if (!showCount || !pagination?.total) return null;
    return (
      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
        </p>
      </div>
    );
  }

  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const btnBase =
    'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition border select-none';
  const btnEnabled =
    'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700';
  const btnDisabled =
    'bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-slate-800 cursor-not-allowed';

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
      {showCount && (
        <p className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
          Showing <span className="font-medium text-gray-700 dark:text-gray-300">{start}</span>–
          <span className="font-medium text-gray-700 dark:text-gray-300">{end}</span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
        </p>
      )}

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button
          type="button"
          onClick={() => hasPrev && onPageChange(page - 1)}
          disabled={!hasPrev}
          className={`${btnBase} ${hasPrev ? btnEnabled : btnDisabled}`}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 whitespace-nowrap">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => hasNext && onPageChange(page + 1)}
          disabled={!hasNext}
          className={`${btnBase} ${hasNext ? btnEnabled : btnDisabled}`}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;