// frontend/src/components/common/Pagination.jsx
// v1.1.0-prod — Adds Page Size Selector (10, 25, 50, 75, 100).

import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 75, 100];

/**
 * @param {Object} props
 * @param {{ page:number, limit:number, total:number, totalPages:number, hasNext:boolean, hasPrev:boolean }} props.pagination
 * @param {(page:number) => void} props.onPageChange
 * @param {(limit:number) => void} [props.onLimitChange] - handler for page size
 * @param {number} [props.currentLimit] - current selected page size
 * @param {boolean} [props.showCount] - show "Showing X–Y of Z" line (default true)
 */
const Pagination = ({ pagination, onPageChange, onLimitChange, currentLimit, showCount = true }) => {
  if (!pagination) return null;

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
    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-3">
      {/* Left: Page Size Selector */}
      <div className="flex items-center gap-2 order-3 lg:order-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Per page:</span>
        <div className="flex gap-1">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onLimitChange && onLimitChange(size)}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                currentLimit === size
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: Count */}
      {showCount && (
        <p className="text-sm text-gray-500 dark:text-gray-400 order-2">
          Showing <span className="font-medium text-gray-700 dark:text-gray-300">{start}</span>–
          <span className="font-medium text-gray-700 dark:text-gray-300">{end}</span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>
        </p>
      )}

      {/* Right: Prev / Page X of Y / Next */}
      <div className="flex items-center gap-2 order-1 lg:order-3">
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
          Page {page} of {totalPages || 1}
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