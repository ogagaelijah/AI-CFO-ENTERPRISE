// frontend/src/hooks/usePlan.js
// v2.0.0-prod — Feature gates + live trial countdown.

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TIER_ORDER = {
  none: 0,
  free: 1,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const daysUntil = (isoDate) => {
  if (!isoDate) return 0;
  const end = startOfDay(new Date(isoDate));
  const now = startOfDay(new Date());
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
};

export const usePlan = () => {
  const { user } = useAuth();
  const plan = user?.planData || null;

  const [liveDaysRemaining, setLiveDaysRemaining] = useState(
    plan?.daysRemaining ?? 0
  );

  // Recompute countdown every minute + on tab focus
  useEffect(() => {
    const recompute = () => {
      if (plan?.isTrial && plan?.trialEndDate) {
        setLiveDaysRemaining(daysUntil(plan.trialEndDate));
      } else {
        setLiveDaysRemaining(plan?.daysRemaining ?? 0);
      }
    };
    recompute();

    const interval = setInterval(recompute, 60 * 1000);
    window.addEventListener('focus', recompute);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', recompute);
    };
  }, [plan?.isTrial, plan?.trialEndDate, plan?.daysRemaining]);

  const features = plan?.features || {};
  const limits = plan?.limits || {};
  const status = plan?.status || 'none';
  const planId = plan?.id || null;

  const isReadOnly = plan?.isReadOnly === true;
  const isTrial = plan?.isTrial === true;
  const isActive = plan?.isActive === true;

  const can = useMemo(
    () => (feature) => {
      if (!feature) return false;
      if (isReadOnly) return false;
      return features[feature] === true;
    },
    [features, isReadOnly]
  );

  const isAtLeast = useMemo(
    () => (tier) => {
      const current = TIER_ORDER[planId] ?? 0;
      const required = TIER_ORDER[tier] ?? 0;
      return current >= required;
    },
    [planId]
  );

  const getLimit = useMemo(
    () => (key) => {
      const value = limits[key];
      return value === undefined ? null : value;
    },
    [limits]
  );

  return {
    plan,
    planId,
    planName: plan?.name || null,
    status,
    isActive,
    isTrial,
    isReadOnly,
    daysRemaining: liveDaysRemaining,
    features,
    limits,
    can,
    isAtLeast,
    getLimit,
  };
};

export default usePlan;