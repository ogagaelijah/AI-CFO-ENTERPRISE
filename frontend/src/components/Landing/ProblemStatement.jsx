import React from 'react';

const problems = [
  {
    icon: '📓',
    problem: 'You know your business.',
    pain: "You don't have time to learn accounting.",
    solution:
      'AI CFO Enterprise assumes you know your business — not debits and credits. Record what happened, and we handle the rest.',
  },
  {
    icon: '💬',
    problem: 'Your numbers are scattered.',
    pain: 'Notebooks, WhatsApp, and your head.',
    solution:
      'Sales, expenses, debtors, stock — all in one place. No more guessing what you earned this month.',
  },
  {
    icon: '📊',
    problem: 'You need answers, not spreadsheets.',
    pain: 'You want to know if you are actually making a profit.',
    solution:
      'Automatic P&L, Cash Flow, Balance Sheet, and executive summaries — explained in plain English.',
  },
];

export default function ProblemStatement() {
  return (
    <section className="py-20 px-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Built for business owners,{' '}
            <span className="text-primary-600 dark:text-gold-400">not accountants</span>
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            You did not start your business to spend your evenings doing bookkeeping.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-colors duration-300"
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.problem}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.pain}</p>
              <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {item.solution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}