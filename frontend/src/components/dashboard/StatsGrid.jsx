// frontend/src/components/dashboard/StatsGrid.jsx
// v1.3.0-prod — bold today + persistent month sub-label for daily metrics

import { Link } from 'react-router-dom';
import { STAT_COLORS } from '../../config/industryConfig';

const DAILY_KEYS = new Set(['revenue', 'sales', 'profit', 'expenses']);
const BALANCE_KEYS = new Set([
  'inventory', 'receivables', 'payables', 'debtors', 'creditors', 'cash',
]);
const CURRENCY_KEYS = new Set([
  'revenue', 'profit', 'expenses', 'cash', 'inventory',
  'receivables', 'payables', 'debtors', 'creditors',
  'raw_materials', 'materials', 'rent', 'fees',
]);

const KPI_LINKS = {
  revenue: '/sales',
  sales: '/sales',
  inventory: '/inventory',
  debtors: '/debtors',
  receivables: '/debtors',
  creditors: '/creditors',
  payables: '/creditors',
  expenses: '/expenses',
  cash: '/reports',
  income: '/income',
  purchases: '/purchases',
  customers: '/customers',
  suppliers: '/suppliers',
};

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();

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
        const isDaily = DAILY_KEYS.has(stat.key);

        let primaryValue = 0;
        let monthValue = null;
        let displayLabel = stat.label;
        let subLabel = null;

        if (isDaily) {
          // Primary = today's value (bold)
          primaryValue = Number(
            kpi.today ?? kpi.month ?? kpi.total ?? kpi.current ?? 0
          );
          displayLabel = kpi.label || `${stat.label} Today`;

          // Month sub-label always shown when month > 0
          const monthNum = Number(kpi.month ?? 0);
          if (monthNum > 0) {
            monthValue = monthNum;
            subLabel = isCurrency
              ? `${formatCurrency(monthNum)} this month`
              : `${formatNumber(monthNum)} this month`;
          }
        } else if (BALANCE_KEYS.has(stat.key)) {
          primaryValue = Number(
            kpi.total ?? kpi.current ?? kpi.month ?? kpi.today ?? 0
          );
          displayLabel = kpi.label || stat.label;
        } else {
          primaryValue = Number(
            kpi.month ?? kpi.total ?? kpi.current ?? kpi.today ?? 0
          );
        }

        const displayValue = isCurrency
          ? formatCurrency(primaryValue)
          : formatNumber(primaryValue);

        const growth = kpi.growth;
        const showGrowth =
          growth !== undefined &&
          growth !== null &&
          growth !== 0 &&
          isDaily;

        const href = KPI_LINKS[stat.key];

        const cardContent = (
          <>
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
                  {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
                </span>
              )}
            </div>

            {/* BIG BOLD: today's value */}
            <h3 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 truncate">
              {displayValue}
            </h3>

            {/* SMALL SUB-LABEL: this month */}
            {subLabel && (
              <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {subLabel}
              </p>
            )}

            {/* Card label */}
            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {displayLabel}
            </p>

            {stat.key === 'inventory' && kpi.lowStock > 0 && (
              <p className="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 mt-0.5 truncate">
                ⚠ {kpi.lowStock} items low stock
              </p>
            )}
          </>
        );

        const baseClasses =
          'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-6 transition-colors duration-300 min-w-0';

        if (href) {
          return (
            <Link
              key={index}
              to={href}
              className={`${baseClasses} hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md cursor-pointer block`}
              aria-label={`View ${stat.label}`}
            >
              {cardContent}
            </Link>
          );
        }

        return (
          <div key={index} className={baseClasses}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;