// frontend/src/components/dashboard/DashboardHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, Bell, Sun, Moon, User, CreditCard, Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';

const DashboardHeader = ({
  user,
  industryConfig,
  IndustryIcon,
  isMobileMenuOpen,
  onMenuToggle,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { planId, planName, isTrial, isReadOnly, daysRemaining } = usePlan();

  const [openDropdown, setOpenDropdown] = useState(null); // 'notifications' | 'profile' | null
  const containerRef = useRef(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleDropdown = (name) =>
    setOpenDropdown((prev) => (prev === name ? null : name));

  // ── Plan badge
  const planStyles = {
    basic: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 border-gray-200 dark:border-slate-600',
    pro: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-gold-400 border-primary-200 dark:border-primary-800',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  const PlanBadge = () => {
    if (isTrial) {
      return (
        <Link
          to="/subscription"
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:opacity-90 transition"
        >
          <span>Trial · {daysRemaining}d left</span>
        </Link>
      );
    }

    if (isReadOnly) {
      return (
        <Link
          to="/subscription"
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:opacity-90 transition"
        >
          <span>Read-only — Upgrade</span>
        </Link>
      );
    }

    const style = planStyles[planId] || planStyles.basic;
    return (
      <Link
        to="/subscription"
        className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${style} hover:opacity-90 transition`}
      >
        <span>{planName || 'Basic'}</span>
      </Link>
    );
  };

  const handleLogout = () => {
    setOpenDropdown(null);
    logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between" ref={containerRef}>
        {/* Mobile menu + logo */}
        <div className="flex items-center space-x-3 md:hidden">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <span className="text-xl font-bold text-primary-600 dark:text-gold-400">
            AI CFO
          </span>
        </div>

        <div className="flex-1 md:flex-none">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <PlanBadge />

          <div
            className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${industryConfig.bgColor} ${industryConfig.iconColor} border ${industryConfig.borderColor}`}
          >
            <IndustryIcon className="w-3.5 h-3.5" />
            <span>{industryConfig.label}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('notifications')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative"
              aria-label="Notifications"
              aria-expanded={openDropdown === 'notifications'}
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {openDropdown === 'notifications' && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </p>
                </div>
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    You're all caught up
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gold-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('profile')}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Account menu"
              aria-expanded={openDropdown === 'profile'}
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">
                {user?.fullName || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
            </button>

            {openDropdown === 'profile' && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </Link>
                  <Link
                    to="/subscription"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    Subscription
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden mt-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Good{' '}
          {new Date().getHours() < 12
            ? 'morning'
            : new Date().getHours() < 17
              ? 'afternoon'
              : 'evening'}
          , {user?.fullName || 'User'} 👋
        </p>
      </div>
    </header>
  );
};

export default DashboardHeader;