// frontend/src/pages/Subscription.jsx
// v2.1.1-prod — pricing page with back button

import { useState, useEffect } from 'react';
import { Loader2, Crown } from 'lucide-react';

import api, { subscriptionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import PlanCard from '../components/subscription/PlanCard';
import PageHeader from '../components/common/PageHeader';
import { reportError, reportEvent } from '../services/telemetry';

const Subscription = () => {
  const { user } = useAuth();
  const { planId: currentPlanId, isTrial, isReadOnly, daysRemaining, plan } = usePlan();

  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await subscriptionApi.getPlans();
        if (cancelled) return;
        if (res.data?.success) setPlans(res.data.plans || []);
      } catch (err) {
        if (cancelled) return;
        reportError(err, { scope: 'Subscription.loadPlans' });
        setError(err.response?.data?.message || err.message || 'Failed to load plans');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectPlan = async (planId) => {
    if (paying) return;
    if (!user?.email) {
      setError('Missing account email. Please log in again.');
      return;
    }

    try {
      setPaying(planId);
      setError('');
      reportEvent('subscription.upgrade_clicked', { planId, billingCycle });

      const res = await api.post('/payment/initialize', {
        plan: planId,
        billingCycle,
        email: user.email,
      });

      if (res.data?.success && res.data.data?.link) {
        window.location.href = res.data.data.link;
      } else {
        setError('Failed to initialize payment');
        setPaying(null);
      }
    } catch (err) {
      reportError(err, { scope: 'Subscription.initializePayment' });
      setError(err.response?.data?.message || err.message || 'Payment initialization failed');
      setPaying(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <PageHeader
        title="Choose your plan"
        subtitle="Unlock intelligence features that help you grow your business."
      />

      <div className="text-center mb-8">
        {isTrial && (
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-gold-300 text-sm">
            <Crown className="w-4 h-4" />
            On {plan?.name} trial — {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
          </div>
        )}
        {isReadOnly && (
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm">
            ⚠️ Read-only mode — subscribe to continue
          </div>
        )}
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 text-sm font-medium rounded-full transition ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 text-sm font-medium rounded-full transition flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Annual
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => (
            <div key={p.id} className="relative">
              <PlanCard
                plan={p}
                billingCycle={billingCycle}
                currentPlanId={currentPlanId}
                onSelect={handleSelectPlan}
              />
              {paying === p.id && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>All plans include full transaction management. Cancel anytime.</p>
        <p className="mt-1">Questions? Contact support.</p>
      </div>
    </div>
  );
};

export default Subscription;