// frontend/src/context/AuthContext.jsx
// v3.0.0-prod — Plan caching, 5xx-vs-404 handling, in-flight dedup, 401 wiring.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  authApi,
  subscriptionApi,
  setUnauthorizedHandler,
} from '../services/api';
import { reportError, reportWarning } from '../services/telemetry';

const AuthContext = createContext();

// ── Plan cache (sessionStorage — cleared on tab close)
const PLAN_CACHE_KEY = 'auth:plan-cache';
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

const readPlanCache = () => {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > PLAN_CACHE_TTL_MS) return null;
    return parsed.plan;
  } catch {
    return null;
  }
};

const writePlanCache = (plan) => {
  try {
    sessionStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), plan })
    );
  } catch {
    /* storage unavailable — non-fatal */
  }
};

const clearPlanCache = () => {
  try {
    sessionStorage.removeItem(PLAN_CACHE_KEY);
  } catch {
    /* noop */
  }
};

// ── Fallback plan (Basic read-only)
const FALLBACK_PLAN = {
  id: 'basic',
  name: 'Basic',
  description: 'For small businesses getting organized',
  features: {},
  limits: {},
  pricing: null,
  status: 'none',
  billingCycle: null,
  isActive: false,
  isTrial: false,
  isReadOnly: true,
  daysRemaining: 0,
  trialEndDate: null,
  endDate: null,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const planFetchRef = useRef(null); // in-flight dedup

  // ── Fetch plan from server, with cache + error classification
  const fetchPlan = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const cached = readPlanCache();
      if (cached) return cached;
    }

    if (planFetchRef.current) return planFetchRef.current;

    const promise = (async () => {
      try {
        const res = await subscriptionApi.getCurrent();

        if (res.data?.success && res.data.plan) {
          const plan = {
            id: res.data.plan.id,
            name: res.data.plan.name,
            description: res.data.plan.description,
            features: res.data.plan.features || {},
            limits: res.data.plan.limits || {},
            pricing: res.data.plan.pricing || null,
            status: res.data.status || 'none',
            billingCycle: res.data.billingCycle ?? null,
            isActive: res.data.isActive === true,
            isTrial: res.data.isTrial === true,
            isReadOnly: res.data.isReadOnly === true,
            daysRemaining: res.data.daysRemaining ?? 0,
            trialEndDate: res.data.trialEndDate ?? null,
            endDate: res.data.endDate ?? null,
          };
          writePlanCache(plan);
          return plan;
        }

        // 200 but no plan → treat as fallback (read-only)
        writePlanCache(FALLBACK_PLAN);
        return FALLBACK_PLAN;
      } catch (err) {
        const status = err.response?.status;

        // 404 → user has no subscription record. Legitimate fallback.
        if (status === 404) {
          writePlanCache(FALLBACK_PLAN);
          return FALLBACK_PLAN;
        }

        // 401 → session invalid; bubble up so caller clears user
        if (status === 401) {
          throw err;
        }

        // 5xx / network — do NOT downgrade a paying user to read-only.
        reportError(err, { scope: 'AuthContext.fetchPlan' });

        // Prefer stale cache over wrong downgrade
        const stale = (() => {
          try {
            const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
            if (!raw) return null;
            return JSON.parse(raw)?.plan || null;
          } catch {
            return null;
          }
        })();

        if (stale) {
          reportWarning('Using stale plan cache after fetch error');
          return stale;
        }

        throw err;
      } finally {
        planFetchRef.current = null;
      }
    })();

    planFetchRef.current = promise;
    return promise;
  }, []);

  // ── Wire 401 handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
      clearPlanCache();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // ── Bootstrap
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await authApi.getCurrentUser();
        if (cancelled) return;

        if (response.data?.user) {
          const userData = response.data.user;
          if (response.data.business?.id) {
            userData.businessId = response.data.business.id;
          }
          userData.planData = await fetchPlan();
          if (cancelled) return;

          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // 401 here is expected when not logged in
        if (err?.response?.status !== 401) {
          reportError(err, { scope: 'AuthContext.bootstrap' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [fetchPlan]);

  const register = async (userData) => {
    const response = await authApi.register(userData);

    if (response.data?.user) {
      const newUser = response.data.user;

      if (response.data.business?.id) {
        newUser.businessId = response.data.business.id;
      }

      // Seed from register payload for instant UI
      if (response.data.trial) {
        newUser.planData = {
          id: response.data.trial.planId,
          name: response.data.trial.planName,
          description: '',
          features: {},
          limits: {},
          pricing: null,
          status: 'trial',
          billingCycle: 'trial',
          isActive: true,
          isTrial: true,
          isReadOnly: false,
          daysRemaining: response.data.trial.days,
          trialEndDate: response.data.trial.endDate,
          endDate: null,
        };
        writePlanCache(newUser.planData);
      }

      try {
        newUser.planData = await fetchPlan({ force: true });
      } catch (err) {
        reportWarning('Plan fetch failed after register; using seed', {
          message: err?.message,
        });
      }

      setUser(newUser);
      setIsAuthenticated(true);
    }

    return response.data;
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);

    if (response.data?.user) {
      const userData = response.data.user;

      if (response.data.business?.id) {
        userData.businessId = response.data.business.id;
      }

      userData.planData = await fetchPlan({ force: true });

      setUser(userData);
      setIsAuthenticated(true);
    }

    return response.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      reportWarning('Logout request failed', { message: err?.message });
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      clearPlanCache();
    }
  };

  /**
   * Force-refresh plan state. Uses functional setUser to avoid stale closure.
   */
  const refreshPlan = useCallback(async () => {
    const planData = await fetchPlan({ force: true });
    setUser((prev) => (prev ? { ...prev, planData } : prev));
    return planData;
  }, [fetchPlan]);

  const value = {
    user,
    setUser,
    isLoading,
    isAuthenticated,
    register,
    login,
    logout,
    refreshPlan,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;