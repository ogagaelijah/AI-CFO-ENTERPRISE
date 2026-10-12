// frontend/src/components/Landing/AboutSection.jsx
// v1.0.0 — Professional CFO positioning. Narrates that AI CFO Enterprise is
//           not just a recording system but an analytical, forecasting,
//           strategic advisor for African SMEs.

import { BarChart3, ShieldAlert, LineChart, Lightbulb, Building2, TrendingUp } from 'lucide-react';

const PILLARS = [
  {
    Icon: BarChart3,
    title: 'Analytics that explain themselves',
    desc: 'Your numbers turned into plain English — what\'s growing, what\'s leaking, what needs attention.',
  },
  {
    Icon: ShieldAlert,
    title: 'Risks surfaced early',
    desc: 'Cash-flow crunches, thin margins, overdue debtors — flagged before they become crises.',
  },
  {
    Icon: LineChart,
    title: 'Forecasts you can act on',
    desc: 'Projected revenue, expenses, and cash position based on your real history — not guesswork.',
  },
  {
    Icon: Lightbulb,
    title: 'Strategic advice, on demand',
    desc: 'Recommendations in your inbox like you\'d get from a seasoned CFO — pricing, collections, growth.',
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-primary-200 dark:border-primary-700">
            <Building2 className="w-3.5 h-3.5" />
            About AI CFO Enterprise
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Not just a recording system — a real CFO.
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A comprehensive business management platform for African SMEs.
          </p>
        </div>

        {/* Two-column: narrative + pillars */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Narrative */}
          <div className="space-y-5 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                AI CFO ENTERPRISE
              </span>{' '}
              goes beyond bookkeeping. It tracks your sales, inventory, income, expenses,
              debtors, and creditors — then does what a real CFO does:{' '}
              <span className="font-semibold text-primary-700 dark:text-gold-400">
                analyses your numbers, shows you the risks, forecasts where you're headed,
                and gives you strategic advice
              </span>{' '}
              so you can make confident business decisions.
            </p>
            <p>
              Built for African SMEs. Simple enough to use today, powerful enough to grow
              with you.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <TrendingUp className="w-4 h-4 text-primary-600 dark:text-gold-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Modular · Interface-neutral · Built for scale
                </span>
              </div>
            </div>
          </div>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PILLARS.map(({ Icon, title, desc }, i) => (
              <div
                key={i}
                className="card group bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-5"
              >
                <Icon className="w-8 h-8 text-primary-600 dark:text-gold-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;