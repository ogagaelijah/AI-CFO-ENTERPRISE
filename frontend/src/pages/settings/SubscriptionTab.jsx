// frontend/src/pages/settings/SubscriptionTab.jsx
// v2.0.0-prod — Real plan data via usePlan, working cancel, upgrade CTA.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Loader2, AlertTriangle } from 'lucide-react';

import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../context/AuthContext';
import { subscriptionApi } from '../../services/api';
import { reportError, reportEvent } from '../../services/telemetry';

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
  reports_basic: 'Basic Reports',
  reports_financial: 'P&L · Cash Flow · Balance Sheet',
  reports_inventory: 'Inventory Reports',
  reports_yearly: 'Yearly Reports',
  reports_executive: 'Executive Reports',
  reports_aging: 'Aging Reports',
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
  account_manager: 'Account Manager',
  api_access: 'API Access',
  white_label: 'White-label',
};

const formatPrice = (amount) =>
  amount === 0 ? 'Free' : `₦${Number(amount).toLocaleString()}`;

const SubscriptionTab = () => {
  const { plan, planName, status, isTrial, isReadOnly, daysRemaining } = usePlan();
  const { refreshPlan } = useAuth();

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const features = plan?.features || {};
  const activeFeatureKeys = Object.keys(features).filter((k) => features[k]);
  const price = plan?.pricing?.monthly ?? 0;

  const handleCancel = async () => {
    if (cancelling) return;
    const confirmed = window.confirm(
      'Cancel your subscription? You will be moved to read-only mode immediately.'
    );
    if (!confirmed) return;

    try {
      setCancelling(true);
      setCancelError('');
      reportEvent('subscription.cancel_clicked', { planId: plan?.id });

      await subscriptionApi.cancel('user_requested');
      await refreshPlan();

      setCancelSuccess(true);
    } catch (err) {
      reportError(err, { scope: 'SubscriptionTab.cancel' });
      setCancelError(
        err.response?.data?.message || err.message || 'Failed to cancel'
      );
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = isReadOnly
    ? 'Read-only'
    : isTrial
      ? 'Trial'
      : status === 'active'
        ? 'Active'
        : status || 'Unknown';

  const statusColor = isReadOnly
    ? 'text-amber-600 dark:text-amber-400'
    : isTrial
      ? 'text-primary-600 dark:text-gold-400'
      : 'text-green-600 dark:text-green-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        📋 Subscription
      </h2>

      {isReadOnly && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Account is in read-only mode</p>
            <p className="text-xs mt-0.5">
              Upgrade to add new records and access intelligence features.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {planName || 'Basic'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
          <p className={`text-2xl font-bold ${statusColor}`}>{statusLabel}</p>
          {isTrial && daysRemaining > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
            </p>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(price)}
            {price > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                /month
              </span>
            )}
          </p>
        </div>
      </div>

      {activeFeatureKeys.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Features Included
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeFeatureKeys.map((key) => (
              <li
                key={key}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <CheckCircle
                  aria-hidden="true"
                  className="w-4 h-4 text-green-500 flex-shrink-0"
                />
                {FEATURE_LABELS[key] || key}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cancelSuccess && (
        <div className="mt-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-300 text-sm">
          Subscription cancelled. Your account is now in read-only mode.
        </div>
      )}

      {cancelError && (
        <div className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          {cancelError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          to="/subscription"
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {isReadOnly ? 'Reactivate' : 'Upgrade Plan'}
        </Link>

        {!isReadOnly && !isTrial && status === 'active' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelling…
              </>
            ) : (
              'Cancel Subscription'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionTab;