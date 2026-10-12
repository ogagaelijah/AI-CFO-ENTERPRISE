// frontend/src/components/Landing/Footer.jsx
// v1.2.0 — Company column now links to #about and #contact (were #faq/mailto).
// v1.1.0 — Replaces Lucide brand icons with inline SVGs.
// v1.0.1 — Fixes grid: lg:grid-cols-6.
// v1.0.0 — Multi-column footer.

import { Phone, MessageCircle, Mail } from 'lucide-react';

/* ── Brand icons (inline SVG — Lucide 1.33.0 no longer ships these) ── */
const YouTubeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
  </svg>
);

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
  </svg>
);

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
  </svg>
);

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.87a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.3z" />
  </svg>
);

const SOCIALS = [
  { label: 'YouTube', href: 'https://youtube.com/@CFOTECHNOLOGIES', Icon: YouTubeIcon, enabled: true },
  { label: 'X (Twitter)', href: 'https://x.com/AICFOTECHHQ', Icon: XIcon, enabled: true },
  { label: 'Instagram', href: 'https://instagram.com/aicfotechnologies', Icon: InstagramIcon, enabled: true },
  { label: 'TikTok', href: 'https://tiktok.com/@aicfotechhq', Icon: TikTokIcon, enabled: true },
  { label: 'Facebook', href: '#', Icon: FacebookIcon, enabled: false },
];

const CONTACTS = [
  { label: '0810 857 8003', href: 'tel:+2348108578003', Icon: Phone, enabled: true },
  { label: '0703 362 1133', href: 'https://wa.me/2347033621133', Icon: MessageCircle, enabled: true },
  { label: 'support@aicfotechnologies.com', href: 'mailto:support@aicfotechnologies.com', Icon: Mail, enabled: true },
];

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Industries', href: '#industries' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Contact', href: '#contact' },
      { label: 'Support', href: '#contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '#resources' },
      { label: 'Videos', href: '#resources' },
      { label: 'Guides', href: '#resources' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="pt-16 pb-8 px-4 bg-gray-900 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 mb-12 text-left">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="text-2xl font-bold text-white mb-3">
              AI CFO <span className="text-gold-400">ENTERPRISE</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Built for African SMEs 🇳🇬
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-gray-300 hover:text-white transition">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Social
            </h3>
            <ul className="space-y-3">
              {SOCIALS.map(({ label, href, Icon, enabled }) => (
                <li key={label}>
                  {enabled ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  ) : (
                    <span
                      className="inline-flex items-center gap-2 text-sm text-gray-500 cursor-not-allowed"
                      title="Coming soon"
                      aria-disabled="true"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                        soon
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              {CONTACTS.map(({ label, href, Icon, enabled }) => (
                <li key={label}>
                  {enabled ? (
                    <a
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-start gap-2 text-sm text-gray-300 hover:text-white transition break-all"
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{label}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-start gap-2 text-sm text-gray-500 cursor-not-allowed">
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{label}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">
            © 2026 AI CFO ENTERPRISE. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}