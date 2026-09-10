// frontend/src/components/dashboard/StatsGrid.jsx
// Daily-first KPIs for retail/wholesale
// v1.1.0-prod

import { STAT_COLORS } from '../../config/industryConfig';

// Metrics that should show TODAY's value (daily-first)
const DAILY_KEYS = new Set([
  'revenue',
  'sales',
  'profit',
  'expenses',
]);

// Metrics that should show TOTAL/CURRENT value (balance-style)
const BALANCE_KEYS = new Set([
  'inventory',
  'receivables',
  'payables',
  'debtors',
  'creditors',
  'cash',
]);

// Currency formatting keys
const CURRENCY_KEYS = new Set([
  'revenue',
  'profit',
  'expenses',
  'cash',
  'inventory',
  'receivables',
  'payables',
  'debtors',
  'creditors',
  'raw_materials',
  'materials',
  'rent',
  'fees',
]);

const StatsGrid = ({ industryConfig, kpis }) => {
  if (!industryConfig?.stats || industryConfig.stats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {industryConfig.stats.map((stat, index) => {
        const kpi = kpis?.[stat.key] || {};
        const StatIcon = stat.icon;
        const colorClass = STAT_COLORS[stat.color] || STAT_COLORS.primary;
        const isCurrency = CURRENCY_KEYS.has(stat.key);

        // ─────────────────────────────────────────────
        // Decide which value to display based on metric type
        // ─────────────────────────────────────────────
        let value = 0;
        let subLabel = null;
        let displayLabel = stat.label;

        if (DAILY_KEYS.has(stat.key)) {
          // Daily-first: today's value
          value = Number(
            kpi.today ??
            kpi.month ??
            kpi.total ??
            kpi.current ??
            0
          );
          displayLabel = kpi.label || `${stat.label} Today`;

          // Show monthly context if available and today's value is 0
          if (value === 0 && kpi.month > 0) {
            subLabel = `₦${Number(kpi.month).toLocaleString()} this month`;
          }
        } else if (BALANCE_KEYS.has(stat.key)) {
          // Balance-style: current/total value
          value = Number(
            kpi.total ??
            kpi.current ??
            kpi.month ??
            kpi.today ??
            0
          );
          displayLabel = kpi.label || stat.label;
        } else {
          // Default: prefer month, then total, then current, then today
          value = Number(
            kpi.month ??
            kpi.total ??
            kpi.current ??
            kpi.today ??
            0
          );
        }

        // ─────────────────────────────────────────────
        // Format the value
        // ─────────────────────────────────────────────
        const displayValue = isCurrency
          ? `₦${Math.round(value).toLocaleString()}`
          : Math.round(value).toLocaleString();

        // ─────────────────────────────────────────────
        // Growth badge (only show when meaningful)
        // ─────────────────────────────────────────────
        const growth = kpi.growth;
        const showGrowth =
          growth !== undefined &&
          growth !== null &&
          growth !== 0 &&
          DAILY_KEYS.has(stat.key);

        return (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-6 transition-colors duration-300 min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`p-1.5 sm:p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                <StatIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {showGrowth && (
                <span
                  className={`text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    growth >= 0
                      ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                      : 'text-red-600 bg-red-50 dark:bg-red-900/30'
                  }`}
                >
                  {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 truncate">
              {displayValue}
            </h3>

            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {displayLabel}
            </p>

            {/* Monthly context sub-label for daily metrics with 0 today */}
            {subLabel && (
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {subLabel}
              </p>
            )}

            {/* Low stock alert for inventory */}
            {stat.key === 'inventory' && kpi.lowStock > 0 && (
              <p className="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 mt-0.5 truncate">
                ⚠️ {kpi.lowStock} items low stock
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;