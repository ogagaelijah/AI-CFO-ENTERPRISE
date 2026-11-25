
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PLAN_FEATURES = [
  { key: 'sales', label: 'Sales & Income tracking' },
  { key: 'inventory', label: 'Inventory management' },
  { key: 'debtors', label: 'Debtors & Creditors' },
  { key: 'reports_basic', label: 'Daily / Weekly / Monthly reports' },
  { key: 'reports_financial', label: 'P&L · Cash Flow · Balance Sheet' },
  { key: 'reports_executive', label: 'Executive reports' },
  { key: 'reports_export', label: 'Export PDF / Excel' },
  { key: 'analytics', label: 'Analytics dashboard' },
  { key: 'forecast', label: 'Forecasting' },
  { key: 'risk', label: 'Risk detection' },
  { key: 'decisions', label: 'Decision engine' },
  { key: 'ai_advisor', label: 'AI CFO Advisor' },
  { key: 'team_roles', label: 'Team roles' },
  { key: 'multi_business', label: 'Multi-business' },
  { key: 'api_access', label: 'API access' },
  { key: 'white_label', label: 'White-label' },
];

const PricingSection = ({ headingLevel = 'h2' }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const sectionRef = useRef(null);

  const Heading = headingLevel === 'h1' ? 'h1' : 'h2';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/subscription/plans`, {
          credentials: 'include',
        });

        const json = await res.json();

        if (cancelled) return;

        if (json?.success && Array.isArray(json.plans)) {
          setPlans(json.plans);
        } else {
          setPlansError('Unable to load plans');
        }
      } catch {
        if (!cancelled) {
          setPlansError('Unable to load plans');
        }
      } finally {
        if (!cancelled) {
          setPlansLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const timeout = setTimeout(() => {
      const elements = section.querySelectorAll('.fade-in');

      elements.forEach((el) => {
        observer.observe(el);

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('visible');
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [plans, plansLoading, plansError]);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <Heading className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4 fade-in">
          Simple, transparent pricing
        </Heading>

        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 fade-in">
          Start with a 14-day Pro trial. No card required.
        </p>

        <div className="flex justify-center mb-12 fade-in">
          <div className="inline-flex items-center bg-gray-100 dark:bg-slate-900 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 md:px-5 md:py-2 text-xs md:text-sm font-medium rounded-full transition ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 md:px-5 md:py-2 text-xs md:text-sm font-medium rounded-full transition flex items-center gap-2 ${
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

        {plansLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : plansError ? (
          <div className="text-center text-red-600 dark:text-red-400 py-8">
            {plansError}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const isYearly = billingCycle === 'yearly';
              const amount = isYearly
                ? plan.pricing?.yearly
                : plan.pricing?.monthly;

              const isPopular = plan.id === 'pro';

              const featureList = PLAN_FEATURES
                .filter((f) => plan.features?.[f.key])
                .map((f) => f.label);

              return (
                <div
                  key={plan.id}
                  className={`card relative text-center fade-in ${
                    isPopular
                      ? 'border-2 border-primary-500 dark:border-gold-400 shadow-lg'
                      : ''
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white bg-primary-500 dark:bg-gold-500 dark:text-slate-900 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 min-h-[40px]">
                    {plan.description}
                  </p>

                  <div className="my-4">
                    <span className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-gold-400">
                      ₦{Number(amount || 0).toLocaleString()}
                    </span>

                    <span className="text-base font-normal text-gray-500 dark:text-gray-400">
                      /{isYearly ? 'year' : 'month'}
                    </span>

                    {isYearly && plan.pricing?.yearlySavings > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Save ₦{plan.pricing.yearlySavings.toLocaleString()} vs monthly
                      </p>
                    )}
                  </div>

                  <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2 mb-6 min-h-[200px]">
                    {featureList.slice(0, 6).map((label, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{label}</span>
                      </li>
                    ))}

                    {featureList.length > 6 && (
                      <li className="text-xs text-gray-500 dark:text-gray-400 italic">
                        + {featureList.length - 6} more features
                      </li>
                    )}
                  </ul>

                  <Link
                    to={`/register?plan=${plan.id}`}
                    className={`block w-full py-3 rounded-lg font-medium transition text-center ${
                      isPopular
                        ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Start 14-day free trial
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 fade-in">
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
