// frontend/src/components/Landing/MegaMenu.jsx
// v1.0.0 — Full-width hover panel. Opens on desktop hover, closes on mouse
//           leave or Escape. Renders columns from NAV_ITEMS[].columns.

import { useEffect } from 'react';

export default function MegaMenu({ item, onClose, onMouseEnter, onMouseLeave }) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!item?.columns?.length) return null;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 right-0 top-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-xl transition-colors duration-300"
      role="region"
      aria-label={`${item.label} menu`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className={`grid gap-8 ${
            item.columns.length === 2
              ? 'md:grid-cols-2'
              : item.columns.length === 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-4'
          }`}
        >
          {item.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-1">
                {col.links.map((link) => {
                  const baseClass =
                    'block rounded-lg px-3 py-2 -mx-3 transition group';

                  if (link.disabled) {
                    return (
                      <li key={link.label}>
                        <div
                          className="block rounded-lg px-3 py-2 -mx-3 cursor-not-allowed opacity-60"
                          aria-disabled="true"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                              {link.label}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              soon
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        onClick={onClose}
                        className={`${baseClass} hover:bg-gray-50 dark:hover:bg-slate-800`}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-gold-400 transition">
                          {link.label}
                        </div>
                        {link.note && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {link.note}
                          </div>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}