
 // frontend/src/components/Landing/AboutSection.jsx
// v1.2.0 — Supports context-aware heading levels for SEO.
//           Defaults to H2 on the homepage; dedicated About page uses H1.

import {
  BarChart3,
  ShieldAlert,
  LineChart,
  Lightbulb,
  Building2,
  TrendingUp,
} from 'lucide-react';

const PILLARS = [
  {
    Icon: BarChart3,
    title: 'Business analytics made clear',
    desc: 'Turn business data into clear insights about revenue, expenses, profitability and performance — explained in plain language.',
  },
  {
    Icon: ShieldAlert,
    title: 'See business risks earlier',
    desc: 'Identify warning signs such as cash-flow pressure, shrinking margins and overdue customer payments before they become bigger problems.',
  },
  {
    Icon: LineChart,
    title: 'Forecasts based on your business data',
    desc: 'Explore projected revenue, expenses and cash flow using your recorded business activity and historical trends.',
  },
  {
    Icon: Lightbulb,
    title: 'Practical recommendations',
    desc: 'Get AI-powered guidance to help you evaluate pricing, improve collections, manage costs and make better business decisions.',
  },
];

const AboutSection = ({ headingLevel = 'h2' }) => {
  const Heading = headingLevel === 'h1' ? 'h1' : 'h2';

  return (
    <section
      id="about"
      className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-primary-200 dark:border-primary-700">
            <Building2 className="w-3.5 h-3.5" />
            About AI CFO Enterprise
          </div>

          <Heading className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            More than business records. Better business decisions.
          </Heading>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Business management and financial analytics that help African SMEs
            understand their numbers, monitor performance and plan ahead.
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
              brings essential business activities together. Track sales,
              inventory, income, expenses, debtors and creditors in one
              platform. Then turn that information into useful financial
              reports, business performance insights and forecasts.
            </p>

            <p>
              More than recording what happens in your business, the platform
              helps you understand{' '}
              <span className="font-semibold text-primary-700 dark:text-gold-400">
                where your money goes, how your business is performing, what
                risks need attention and what your numbers may mean for the
                future.
              </span>{' '}
              This is the virtual CFO experience: clearer information and
              practical guidance for more confident decisions.
            </p>

            <p>
              Built for African SMEs, AI CFO Enterprise makes business
              management and financial insights easier to access as your
              business grows.
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
