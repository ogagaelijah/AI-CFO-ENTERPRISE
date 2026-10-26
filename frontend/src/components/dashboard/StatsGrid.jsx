// frontend/src/components/dashboard/StatsGrid.jsx
// v1.7.0-prod — Renders low stock item names for inventory.

import { Link } from 'react-router-dom';
import { STAT_COLORS } from '../../config/industryConfig';
import useRole from '../../hooks/useRole';

const DAILY_KEYS = new Set(['revenue', 'sales', 'profit', 'expenses', 'cash_in', 'cash_out']);
const BALANCE_KEYS = new Set([
  'inventory', 'receivables', 'payables', 'debtors', 'creditors', 'cash',
]);
const CURRENCY_KEYS = new Set([
  'revenue', 'profit', 'expenses', 'cash', 'inventory',
  'receivables', 'payables', 'debtors', 'creditors',
  'raw_materials', 'materials', 'rent', 'fees',
  'cash_in', 'cash_out',
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
  cash_in: '/reports',
  cash_out: '/reports',
  income: '/income',
  purchases: '/purchases',
  customers: '/customers',
  suppliers: '/suppliers',
  projects: '/projects',
  invoices: '/invoices',
};

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString();

const StatsGrid = ({ industryConfig, kpis }) => {
  const { role } = useRole();

  if (!industryConfig?.stats || industryConfig.stats.length === 0) {
    return null;
  }

  const visibleStats = industryConfig.stats.filter((stat) => {
    if (!stat.roles) return true;
    return stat.roles.includes(role);
  });

  if (visibleStats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {visibleStats.map((stat, index) => {
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
          primaryValue = Number(
            kpi.today ?? kpi.month ?? kpi.total ?? kpi.current ?? 0
          );
          displayLabel = stat.label || kpi.label || `${stat.label} Today`;

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
          displayLabel = stat.label || kpi.label || stat.label;
        } else {
          primaryValue = Number(
            kpi.month ?? kpi.total ?? kpi.current ?? kpi.today ?? 0
          );
          displayLabel = stat.label || kpi.label || stat.label;
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

        // Safely extract low stock items for the inventory card
        const lowStockItems = stat.key === 'inventory' && Array.isArray(kpi.lowStockItems) 
          ? kpi.lowStockItems 
          : [];

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

            <h3 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 truncate">
              {displayValue}
            </h3>

            {subLabel && (
              <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {subLabel}
              </p>
            )}

            <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {displayLabel}
            </p>

            {/* Render low stock count and names inline */}
            {stat.key === 'inventory' && kpi.lowStock > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                <p className="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 font-semibold mb-1">
                  ⚠ {kpi.lowStock} item(s) low
                </p>
                {lowStockItems.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between text-[10px] text-gray-600 dark:text-gray-300">
                    <span className="truncate pr-1">{item.item_name || item.name}</span>
                    <span className="font-medium text-orange-500">{item.quantity}</span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">+{lowStockItems.length - 3} more</p>
                )}
              </div>
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