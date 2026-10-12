// frontend/src/components/Landing/LoyaltyBanner.jsx
// v1.3.0 — Adds CSS animations: headline fade-in-slide, gold shimmer on
//           the ₦3M amount, gradient sweep on CTA hover.
// v1.2.0 — Light-mode CTA button now uses primary-600 (navy) instead of
//           gold, matching the rest of the page's primary actions.
//           Dark mode still uses gold. Uniform light-mode look.
// v1.1.0 — Fixes light/dark mode: banner now adapts to theme instead of
//           always rendering dark.
// v1.0.0 — ₦3M financing incentive banner. Mounts between Pricing and FAQ.

import { ChevronRight, Sparkles } from 'lucide-react';

const LoyaltyBanner = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Local keyframes — scoped so they don't leak to other components */}
      <style>{`
        @keyframes lb-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb-shimmer {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50%      { opacity: 0.9; filter: brightness(1.25); }
        }
        @keyframes lb-sweep {
          from { transform: translateX(-120%); }
          to   { transform: translateX(220%); }
        }
        .lb-fade-up { animation: lb-fade-up 0.7s ease-out both; }
        .lb-fade-up-delay-1 { animation-delay: 0.1s; }
        .lb-fade-up-delay-2 { animation-delay: 0.25s; }
        .lb-fade-up-delay-3 { animation-delay: 0.4s; }
        .lb-shimmer { animation: lb-shimmer 2.6s ease-in-out infinite; }
        .lb-sweep-btn { position: relative; overflow: hidden; }
        .lb-sweep-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 60%; height: 100%;
          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(255, 255, 255, 0.35) 50%,
            transparent 100%
          );
          transform: translateX(-120%);
          pointer-events: none;
        }
        .lb-sweep-btn:hover::after {
          animation: lb-sweep 0.9s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .lb-fade-up, .lb-shimmer, .lb-sweep-btn::after {
            animation: none !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl border-2 border-primary-300/60 dark:border-gold-400/30 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none p-8 md:p-12 text-center overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary-200/40 dark:bg-gold-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-primary-200/30 dark:bg-gold-400/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="lb-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-gold-400/10 text-primary-700 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-6 border border-primary-300 dark:border-gold-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Loyalty Reward
            </div>

            <h2 className="lb-fade-up lb-fade-up-delay-1 text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              Stay 10 months.{' '}
              <span className="lb-shimmer inline-block text-primary-600 dark:text-gold-400">
                Unlock up to ₦3,000,000.
              </span>
            </h2>

            <p className="lb-fade-up lb-fade-up-delay-2 text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Subscribe to AI CFO Enterprise for 10 out of your first 12 months and become
              eligible for business financing of up to ₦3,000,000. Grow without limits.
            </p>

            <a
              href="#faq"
              className="lb-fade-up lb-fade-up-delay-3 lb-sweep-btn inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 dark:text-slate-900 dark:bg-gold-400 dark:hover:bg-gold-300 rounded-xl transition shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Learn how it works
              <ChevronRight className="w-5 h-5" />
            </a>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-8 max-w-2xl mx-auto leading-relaxed">
              Financing subject to eligibility verification, credit assessment, and partner
              terms. Terms and conditions apply.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyBanner;