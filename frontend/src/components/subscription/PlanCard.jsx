// frontend/src/components/subscription/PlanCard.jsx
// v1.1.0-prod — Plan card with accessibility improvements.

import { Check } from 'lucide-react';

const FEATURE_LABELS = {
  sales: 'Sales & Income',
  purchases: 'Purchases',
  expenses: 'Expenses',
  income: 'Other Income',
  customers: 'Customers',
  suppliers: 'Suppliers',
  debtors: 'Debtors',
  creditors: 'Creditors',
  payments: 'Payments',
  inventory: 'Inventory',
  reports_basic: 'Daily / Weekly / Monthly Reports',
  reports_financial: 'P&L · Cash Flow · Balance Sheet',
  reports_inventory: 'Inventory Reports',
  reports_yearly: 'Yearly Reports',
  reports_executive: 'Executive Reports',
  reports_aging: 'Aging Reports (AR/AP)',
  reports_export: 'Export PDF / Excel',
  analytics: 'Analytics',
  forecast: 'Forecast',
  risk: 'Risk Detection',
  decisions: 'Decisions',
  alerts: 'Alerts',
  ai_advisor: 'AI CFO Advisor',
  team_roles: 'Team Roles',
  multi_business: 'Multi-business',
  support_email: 'Email Support',
  support_priority: 'Priority Support',
  account_manager: 'Dedicated Account Manager',
  api_access: 'API Access',
  white_label: 'White-label',
};

const LIMIT_LABELS = {
  transactions_per_month: 'Transactions / month',
  inventory_items: 'Inventory items',
  customers: 'Customers',
  users: 'Users',
  ai_queries_per_day: 'AI queries / day',
  data_retention_months: 'Data retention',
};

const formatLimit = (key, value) => {
  if (value === -1 || value === null || value === undefined) return 'Unlimited';
  if (key === 'data_retention_months') return `${value} months`;
  return value.toLocaleString();
};

const PlanCard = ({
  plan,
  billingCycle = 'monthly',
  currentPlanId = null,
  onSelect,
}) => {
  const pricing = plan.pricing || {};
  const isYearly = billingCycle === 'yearly';
  const amount = isYearly ? pricing.yearly : pricing.monthly;
  const isPopular = plan.id === 'pro';
  const isCurrent = plan.id === currentPlanId;
  const discount = pricing.yearlyDiscountPercent || 0;
  const savings = pricing.yearlySavings || 0;

  const featureKeys = Object.keys(plan.features || {}).filter(
    (k) => plan.features[k]
  );
  const limitKeys = Object.keys(plan.limits || {});

  return (
    <div
      aria-labelledby={`plan-${plan.id}-name`}
      className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-800 p-6 sm:p-8 transition-all ${
        isPopular
          ? 'border-2 border-primary-500 dark:border-gold-400 shadow-xl scale-[1.02]'
          : 'border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      {isPopular && (
        <span
          aria-label="Most popular plan"
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white bg-primary-500 dark:bg-gold-500 dark:text-slate-900 rounded-full whitespace-nowrap"
        >
          Most Popular
        </span>
      )}

      {isCurrent && (
        <span
          aria-label="Your current plan"
          className="absolute top-4 right-4 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full"
        >
          Current Plan
        </span>
      )}

      <h3
        id={`plan-${plan.id}-name`}
        className="text-2xl font-bold text-gray-900 dark:text-white"
      >
        {plan.name}
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 min-h-[40px]">
        {plan.description}
      </p>

      <div className="mt-6">
        <span className="text-4xl font-bold text-primary-600 dark:text-gold-400">
          ₦{Number(amount).toLocaleString()}
        </span>
        <span className="text-base font-normal text-gray-500 dark:text-gray-400">
          /{isYearly ? 'year' : 'month'}
        </span>

        {isYearly && discount > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
              Save {discount}%
            </span>
            <span className="text-gray-500 dark:text-gray-400 line-through">
              ₦{(pricing.monthly * 12).toLocaleString()}
            </span>
          </div>
        )}

        {isYearly && savings > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            You save ₦{savings.toLocaleString()} vs monthly
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(plan.id)}
        disabled={isCurrent}
        aria-current={isCurrent ? 'true' : undefined}
        aria-label={
          isCurrent ? `${plan.name} is your current plan` : `Choose ${plan.name} plan`
        }
        className={`mt-6 w-full py-3 rounded-lg font-medium transition ${
          isCurrent
            ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
            : isPopular
              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      >
        {isCurrent ? 'Current Plan' : `Choose ${plan.name}`}
      </button>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Features
        </p>
        {featureKeys.map((key) => (
          <div
            key={key}
            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Check
              aria-hidden="true"
              className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"
            />
            <span>{FEATURE_LABELS[key] || key}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Limits
        </p>
        {limitKeys.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
          >
            <span>{LIMIT_LABELS[key] || key}</span>
            <span className="font-medium">{formatLimit(key, plan.limits[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanCard;