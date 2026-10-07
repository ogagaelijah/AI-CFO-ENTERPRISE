import React, { useState } from 'react';

const FAQ_GROUPS = [
  {
    category: 'What is AI CFO Enterprise?',
    items: [
      {
        q: 'What does AI CFO Enterprise do?',
        a: 'AI CFO Enterprise helps African SMEs track sales, inventory, debtors, and profits — all in one place. You record what happens in your business, and it automatically builds your reports: P&L, Cash Flow, Balance Sheet, and executive summaries. It also forecasts future revenue and gives you AI-powered business recommendations.',
      },
      {
        q: 'Who is it for?',
        a: 'AI CFO Enterprise is built for African SMEs. Today it serves Retail/Wholesale, Construction, Consultancy/Services, Education, and NGO/Non-Profit businesses. Manufacturing, Healthcare, Real Estate, and Logistics are coming soon.',
      },
      {
        q: 'How is it different from accounting software like QuickBooks or Sage?',
        a: 'Traditional accounting software assumes you know accounting. AI CFO Enterprise assumes you know your business. You record sales, expenses, and payments in plain language, and the system handles the accounting logic automatically — then explains what the numbers mean in plain English.',
      },
      {
        q: 'Do I need accounting knowledge to use it?',
        a: 'No. If you can record a sale or an expense, you can use AI CFO Enterprise. The system handles double-entry, categorisation, and report generation for you.',
      },
    ],
  },
  {
    category: 'Features & Capabilities',
    items: [
      {
        q: 'What can I track with AI CFO Enterprise?',
        a: 'Sales & income, inventory and stock levels, debtors (who owes you), creditors (who you owe), expenses, invoices, customer payments, projects, time entries, donations, and pledges. Everything feeds into your reports automatically.',
      },
      {
        q: 'What reports do I get?',
        a: 'Daily, weekly, monthly, and yearly reports with profit margins. That includes Profit & Loss, Cash Flow, Balance Sheet, and executive summaries. Reports can be printed or downloaded as PDF.',
      },
      {
        q: 'How does the forecasting and AI work?',
        a: 'The system looks at your historical sales, expenses, and cash patterns, then projects future revenue and cash position. The AI layer then interprets those projections and gives you plain-language recommendations — for example, "your cash flow tightens in March, consider collecting outstanding debtors first."',
      },
      {
        q: 'Can I print or download invoices and fee receipts?',
        a: 'Yes. Invoices and student fee receipts can be printed directly or downloaded as PDF from the detail view.',
      },
      {
        q: 'Does it work for multiple industries?',
        a: 'Yes. The system adapts to your industry when you register. Retail gets inventory and debtor tracking; Education gets student fees and class enrollments; NGOs get donations and pledges; Construction gets projects and partial payments; Consultancy gets time entries and service billing.',
      },
    ],
  },
  {
    category: 'Industries',
    items: [
      {
        q: 'Which industries are live today?',
        a: 'Five industries are live: Retail / Wholesale, Construction, Consultancy / Services, Education, and NGO / Non-Profit.',
      },
      {
        q: 'Which industries are coming soon?',
        a: 'Manufacturing, Healthcare, Real Estate, and Logistics — bringing the total to 9 industries.',
      },
      {
        q: 'Can I use it if my industry is not live yet?',
        a: 'Not yet. The system is purpose-built per industry, so we recommend waiting until your industry goes live. You can sign up to be notified when it does.',
      },
    ],
  },
  {
    category: 'Pricing & Plans',
    items: [
      {
        q: 'How much does AI CFO Enterprise cost?',
        a: 'Three plans: Basic — ₦2,500/month for small businesses getting organized. Pro — ₦4,500/month for full intelligence for growing businesses (most popular). Enterprise — ₦10,500/month for everything, unlimited, with dedicated support.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes. All paid plans include a 14-day free trial with full Pro access. No card required. Cancel anytime.',
      },
      {
        q: "What's the difference between Basic, Pro, and Enterprise?",
        a: 'All plans include sales & income tracking, inventory management, debtors & creditors, daily/weekly/monthly reports, and P&L, Cash Flow, and Balance Sheet. Pro adds forecasting, AI recommendations, and executive reports. Enterprise adds unlimited usage, dedicated support, and everything in Pro.',
      },
      {
        q: 'Can I switch plans later?',
        a: 'Yes. You can upgrade, downgrade, or cancel at any time from your account settings.',
      },
      {
        q: 'Do you offer annual billing?',
        a: 'Yes. Pay annually and save 17% compared to monthly billing.',
      },
      {
        q: 'What happens when my 14-day trial ends?',
        a: 'You keep your data. You can continue on the Basic plan or upgrade to Pro or Enterprise. Nothing is deleted.',
      },
      {
        q: 'Do I need a credit card to start the trial?',
        a: 'No. The 14-day trial requires no card.',
      },
    ],
  },
  {
    category: 'Data & Security',
    items: [
      {
        q: 'Where is my financial data stored?',
        a: 'On Supabase (a managed Postgres database) with encryption in transit and at rest. Access is restricted and audited.',
      },
      {
        q: 'Do you sell or share my data?',
        a: 'No. Your data belongs to you. We do not sell, rent, or monetise it.',
      },
      {
        q: 'Who can see my financial data?',
        a: 'Only you (and any team members you explicitly invite). Our support team can access your account only with your permission, for troubleshooting.',
      },
      {
        q: 'Is my data backed up?',
        a: 'Yes. The database is backed up regularly. We also maintain the ability to restore in case of failure.',
      },
      {
        q: 'What happens if I stop paying?',
        a: 'Your data stays intact. You can export it at any time. Access to paid features is paused until you resume.',
      },
    ],
  },
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How long does setup take?',
        a: 'Under 5 minutes. Register, select your industry, and start recording your first transaction.',
      },
      {
        q: 'Do I need to import my old records?',
        a: 'No. You can start fresh from today. If you have prior records you want reflected, you can enter them as opening balances.',
      },
      {
        q: 'Can my staff use it too?',
        a: 'Yes. You can invite team members with role-based access (e.g., a cashier can record sales but not view P&L).',
      },
      {
        q: 'Does it work on mobile?',
        a: 'Today you can use AI CFO Enterprise through the web interface and via our Telegram bot. A dedicated mobile app is coming after public launch.',
      },
      {
        q: 'What if I get stuck?',
        a: 'Use the chat widget in the bottom-right corner for instant answers, or email support@aicfotechnologies.com.',
      },
    ],
  },
  {
    category: 'Security & Trust',
    items: [
      {
        q: 'Is my payment information safe?',
        a: 'Yes. Payments are processed by Paystack, a PCI-DSS compliant payment provider. We never store your card details on our servers.',
      },
      {
        q: 'How do I report a bug or security issue?',
        a: 'Email support@aicfotechnologies.com. We take all reports seriously and respond within 48 hours.',
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
          {q}
        </span>
        <span
          className={`shrink-0 mt-1 text-primary-600 dark:text-gold-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-4 pr-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="py-20 px-6 bg-white dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {/* Left column */}
        <div className="md:col-span-1">
          <div className="md:sticky md:top-24">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Frequently asked{' '}
              <span className="text-primary-600 dark:text-gold-400">questions</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
              Everything you need to know about AI CFO Enterprise. Can't find your answer? Ask
              our AI assistant or email us.
            </p>
            <a
              href="mailto:support@aicfotechnologies.com"
              className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-semibold text-sm hover:bg-primary-700 dark:hover:bg-gold-600 transition"
            >
              Email support
            </a>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2">
          {FAQ_GROUPS.map((group, i) => (
            <div key={i} className="mb-10 last:mb-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-gold-400 mb-2">
                {group.category}
              </h3>
              <div>
                {group.items.map((item, j) => (
                  <AccordionItem key={j} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}