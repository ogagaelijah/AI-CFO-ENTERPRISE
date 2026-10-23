// frontend/src/components/Landing/Navbar.jsx
// v1.1.0 — Adds direct APK download button for Desktop and Mobile.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun, Menu, X, ChevronDown, Smartphone } from 'lucide-react'; 
import MegaMenu from './MegaMenu';
import { NAV_ITEMS } from '../../data/navigation';

const HOVER_CLOSE_DELAY = 120; // ms — prevents flicker when moving into panel

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);       
  const [expandedMobile, setExpandedMobile] = useState(null); 
  const closeTimer = useRef(null);

  // Clear any pending close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), HOVER_CLOSE_DELAY);
  };

  const handleMouseEnter = (label) => {
    cancelClose();
    setOpenMenu(label);
  };

  const handleMobileLinkClick = () => {
    setIsMobileOpen(false);
    setExpandedMobile(null);
  };

  const toggleMobileAccordion = (label) => {
    setExpandedMobile((prev) => (prev === label ? null : label));
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
              ENTERPRISE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => {
              const hasPanel = Array.isArray(item.columns) && item.columns.length > 0;
              const isOpen = openMenu === item.label;

              if (!hasPanel) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition"
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={scheduleClose}
                  className="relative"
                >
                  <a
                    href={item.href}
                    className={`inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition ${
                      isOpen ? 'text-primary-600 dark:text-gold-400' : ''
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </a>
                </div>
              );
            })}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gold-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Desktop Download Button */}
            <a
              href="/ai-cfo-app.apk"
              download
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition border border-gray-200 dark:border-slate-700"
            >
              <Smartphone className="w-4 h-4 text-green-500" />
              Get App
            </a>

            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-gold-500 dark:text-slate-900 rounded-lg hover:bg-primary-700 dark:hover:bg-gold-600 transition shadow-md hover:shadow-lg"
            >
              Sign up free
            </Link>
          </div>

          {/* Mobile right actions */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gold-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop mega panel */}
      {openMenu && (
        <div className="hidden md:block">
          {NAV_ITEMS.filter((i) => i.label === openMenu).map((item) => (
            <MegaMenu
              key={item.label}
              item={item}
              onClose={() => setOpenMenu(null)}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            />
          ))}
        </div>
      )}

      {/* Mobile slide-down */}
      {isMobileOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const hasPanel = Array.isArray(item.columns) && item.columns.length > 0;

              if (!hasPanel) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={handleMobileLinkClick}
                    className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition py-3"
                  >
                    {item.label}
                  </a>
                );
              }

              const expanded = expandedMobile === item.label;

              return (
                <div key={item.label} className="border-b border-gray-100 dark:border-slate-800 last:border-b-0">
                  <button
                    onClick={() => toggleMobileAccordion(item.label)}
                    className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 py-3"
                    aria-expanded={expanded}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expanded && (
                    <div className="pb-3 space-y-4">
                      {item.columns.map((col) => (
                        <div key={col.title}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-2">
                            {col.title}
                          </p>
                          <ul className="space-y-0.5">
                            {col.links.map((link) =>
                              link.disabled ? (
                                <li key={link.label}>
                                  <div className="flex items-center gap-2 px-2 py-2 opacity-60 cursor-not-allowed">
                                    <span className="text-sm text-gray-400 dark:text-gray-500">
                                      {link.label}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                      soon
                                    </span>
                                  </div>
                                </li>
                              ) : (
                                <li key={link.label}>
                                  <a
                                    href={link.href}
                                    target={link.external ? '_blank' : undefined}
                                    rel={link.external ? 'noopener noreferrer' : undefined}
                                    onClick={handleMobileLinkClick}
                                    className="block px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                                  >
                                    {link.label}
                                  </a>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <hr className="border-gray-200 dark:border-slate-700 my-3" />

            {/* Mobile Download Button */}
            <a
              href="/ai-cfo-app.apk"
              download
              onClick={handleMobileLinkClick}
              className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 font-medium py-3 border border-gray-200 dark:border-slate-700 rounded-lg mb-2"
            >
              <Smartphone className="w-5 h-5 text-green-500" />
              Download Android App
            </a>

            <Link
              to="/login"
              onClick={handleMobileLinkClick}
              className="block text-primary-600 dark:text-gold-400 font-medium py-3 text-center"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={handleMobileLinkClick}
              className="block text-center text-white bg-primary-600 dark:bg-gold-500 dark:text-slate-900 rounded-lg px-4 py-3 font-medium"
            >
              Sign up free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}