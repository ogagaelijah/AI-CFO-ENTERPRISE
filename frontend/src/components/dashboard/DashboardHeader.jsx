// frontend/src/components/dashboard/DashboardHeader.jsx
// v1.3.0 — Replaces inline profile dropdown with shared <UserMenu />.
//          Adds role badge next to name. Notification bell, theme toggle,
//          plan badge, and industry pill unchanged.
// v1.1.0 — Adds EmailStatusBadge (compact) in the avatar dropdown.
// v1.0.0 — Initial.

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, Bell, Sun, Moon, ChevronDown, Check,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import RoleBadge from '../common/RoleBadge';
import api from '../../services/api'; // ★ NEW

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

  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // ★ NEW: Notification state
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const containerRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // ★ NEW: Fetch notifications
  const fetchNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const toggleDropdown = (name) => {
    const isOpening = openDropdown !== name;
    setOpenDropdown(isOpening ? name : null);
    if (name === 'notifications' && isOpening) {
      fetchNotifications(); // Refresh when opening
    }
  };

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
    setProfileOpen(false);
    logout();
    window.location.href = '/';
  };

  const displayName = user?.fullName || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const canAccessSettings = ['OWNER', 'ADMIN'].includes(user?.role);

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between" ref={containerRef}>
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

          {/* ★ UPDATED: Notifications */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('notifications')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative"
              aria-label="Notifications"
              aria-expanded={openDropdown === 'notifications'}
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {openDropdown === 'notifications' && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                     <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                       {unreadCount} new
                     </span>
                  )}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingNotifs ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No new notifications
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        You're all caught up
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {notifications.map(n => (
                        <li key={n.id} className={`p-4 transition ${n.is_read ? 'opacity-60 bg-transparent' : 'bg-blue-50/50 dark:bg-slate-700/30'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-2">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!n.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="p-1 text-gray-400 hover:text-green-600 rounded transition"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

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

          {/* Profile dropdown — now shows role badge */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Account menu"
              aria-expanded={profileOpen}
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
              <div className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {displayName}
                </span>
                <RoleBadge role={user?.role} size="xs" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {user?.email || ''}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <RoleBadge role={user?.role} size="xs" />
                    {user?.businessName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        · {user.businessName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    to="/subscription"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    Subscription
                  </Link>
                  {canAccessSettings && (
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                      Settings
                    </Link>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
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
          , {displayName} 👋
        </p>
      </div>
    </header>
  );
};

export default DashboardHeader;