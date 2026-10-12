// frontend/src/components/Landing/ContactSection.jsx
// v1.1.0 — Email card no longer uses mailto (doesn't fire on machines
//           without a default mail client). Now shows the address with
//           a Copy button.
// v1.0.0 — Contact card grid: Phone, WhatsApp, Email. Anchored at #contact.

import { useState } from 'react';
import { Phone, MessageCircle, Mail, Copy, Check } from 'lucide-react';

const CONTACTS = [
  {
    Icon: Phone,
    label: 'Call us',
    value: '0810 857 8003',
    href: 'tel:+2348108578003',
    note: 'Mon–Fri, 9am–6pm WAT',
  },
  {
    Icon: MessageCircle,
    label: 'WhatsApp',
    value: '0703 362 1133',
    href: 'https://wa.me/2347033621133',
    note: 'Fastest response',
    external: true,
  },
  {
    Icon: Mail,
    label: 'Email us',
    value: 'support@aicfotechnologies.com',
    copyValue: 'support@aicfotechnologies.com',
    note: 'We reply within 24 hours',
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail on non-HTTPS or older browsers — fail silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-medium text-primary-700 dark:text-gold-400 bg-primary-50 dark:bg-primary-900/30 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition"
      aria-label={copied ? 'Copied' : 'Copy email address'}
      type="button"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  );
}

const ContactSection = () => {
  return (
    <section id="contact" className="py-20 px-4 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Get in touch
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We respond within 24 hours. Prefer to chat instantly? Use the widget in the
            bottom-right corner.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CONTACTS.map(({ Icon, label, value, href, copyValue, note, external }, i) => {
            const cardClasses = 'card group block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 text-center transition';

            const inner = (
              <>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-gold-400" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  {label}
                </h3>
                <p className="text-base font-semibold text-gray-900 dark:text-white break-all mb-1">
                  {value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p>
                {copyValue && <CopyButton text={copyValue} />}
              </>
            );

            // Card with link (phone, WhatsApp)
            if (href) {
              return (
                <a
                  key={i}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className={`${cardClasses} hover:shadow-lg hover:-translate-y-0.5`}
                >
                  {inner}
                </a>
              );
            }

            // Card without link (email + copy button)
            return (
              <div key={i} className={cardClasses}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;