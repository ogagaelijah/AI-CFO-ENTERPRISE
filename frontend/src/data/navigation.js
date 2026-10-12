// frontend/src/data/navigation.js
// v1.0.0 — Central nav config. Consumed by Navbar.jsx and MegaMenu.jsx.
//
// Structure:
//   simple link   → { label, href }
//   mega-menu     → { label, href, columns: [...] }
//
// Column entries can have:
//   - `disabled: true` for "coming soon" (renders greyed out, not clickable)
//   - `note` for a small subtitle under the label
//   - `external: true` to open in a new tab

export const NAV_ITEMS = [
  { label: 'About', href: '#about' },
  {
    label: 'Features',
    href: '#features',
    columns: [
      {
        title: 'Track',
        links: [
          { label: 'Sales & Income', href: '#features', note: 'Record every sale in seconds' },
          { label: 'Inventory', href: '#features', note: 'Stock levels + low-stock alerts' },
          { label: 'Debtors & Creditors', href: '#features', note: 'Who owes you, who you owe' },
          { label: 'Expenses', href: '#features', note: 'Categories that match your business' },
        ],
      },
      {
        title: 'Analyse',
        links: [
          { label: 'Analytics dashboard', href: '#features', note: 'The numbers, in real time' },
          { label: 'Reports (P&L · Cash Flow · BS)', href: '#features', note: 'Statements built automatically' },
          { label: 'Executive summaries', href: '#features', note: 'Board-ready, one page' },
          { label: 'Export PDF / Excel', href: '#features', note: 'Share with your accountant' },
        ],
      },
      {
        title: 'Decide',
        links: [
          { label: 'Forecasting', href: '#features', note: 'See where you\'re heading' },
          { label: 'Risk detection', href: '#features', note: 'Catch problems early' },
          { label: 'Decision engine', href: '#features', note: 'Concrete action items' },
          { label: 'AI CFO Advisor', href: '#features', note: 'Advice in plain English' },
        ],
      },
    ],
  },
  {
    label: 'Industries',
    href: '#industries',
    columns: [
      {
        title: 'Live today',
        links: [
          { label: 'Retail / Wholesale', href: '#industries' },
          { label: 'Construction', href: '#industries' },
          { label: 'Consultancy / Services', href: '#industries' },
          { label: 'Education', href: '#industries' },
          { label: 'NGO / Non-Profit', href: '#industries' },
        ],
      },
      {
        title: 'Coming soon',
        links: [
          { label: 'Manufacturing', href: '#industries', disabled: true },
          { label: 'Healthcare', href: '#industries', disabled: true },
          { label: 'Real Estate', href: '#industries', disabled: true },
          { label: 'Logistics', href: '#industries', disabled: true },
        ],
      },
    ],
  },
  { label: 'Pricing', href: '#pricing' },
  {
    label: 'Resources',
    href: '#resources',
    columns: [
      {
        title: 'Learn',
        links: [
          { label: 'Blog', href: '#resources', note: 'Long-form guides' },
          { label: 'Videos', href: '#resources', note: 'Short walkthroughs' },
          { label: 'Guides', href: '#resources', note: 'Practical how-tos' },
        ],
      },
      {
        title: 'Connect',
        links: [
          { label: 'YouTube', href: 'https://youtube.com/@CFOTECHNOLOGIES', external: true, note: 'Subscribe for demos' },
          { label: 'Help Center', href: '#faq', note: 'Common questions' },
          { label: 'Contact Support', href: '#contact', note: 'We reply within 24h' },
        ],
      },
    ],
  },
  { label: 'FAQ', href: '#faq' },
];