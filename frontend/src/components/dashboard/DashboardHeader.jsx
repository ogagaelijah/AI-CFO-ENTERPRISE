// frontend/src/components/dashboard/DashboardHeader.jsx
// v1.5.0 — Ensures NEW_SALE notifications stay unread until explicitly clicked.

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Bell, Sun, Moon, ChevronDown, CheckCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useNotifications } from '../../context/NotificationContext';
import RoleBadge from '../common/RoleBadge';

const DashboardHeader = ({ user, industryConfig, IndustryIcon, isMobileMenuOpen, onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { planId, planName, isTrial, isReadOnly, daysRemaining } = usePlan();
  const {
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllAsRead,
  } = useNotifications();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const containerRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenDropdown(null);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpenDropdown(null); setProfileOpen(false); setSelected(null); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleDropdown = (name) => {
    const opening = openDropdown !== name;
    setOpenDropdown(opening ? name : null);
    // Fetch fresh notifications when the bell is opened
    if (name === 'notifications' && opening) {
      fetchNotifications();
    }
  };

  const handleOpenNotification = async (n) => {
    setSelected(n);
    setOpenDropdown(null);
    // Only mark as read when they click it
    if (!n.is_read) {
      await markAsRead(n.id);
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
        <Link to="/subscription" className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:opacity-90 transition">
          <span>Trial · {daysRemaining}d left</span>
        </Link>
      );
    }
    if (isReadOnly) {
      return (
        <Link to="/subscription" className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:opacity-90 transition">
          <span>Read-only — Upgrade</span>
        </Link>
      );
    }
    const style = planStyles[planId] || planStyles.basic;
    return (
      <Link to="/subscription" className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${style} hover:opacity-90 transition`}>
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
    <>
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between" ref={containerRef}>
          <div className="flex items-center space-x-3 md:hidden">
            <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" aria-label="Toggle menu">
              {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
            </button>
            <span className="text-xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
          </div>

          <div className="flex-1 md:flex-none">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Dashboard</h1>
          </div>

          <div className="flex items-center space-x-2">
            <PlanBadge />

            <div className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${industryConfig.bgColor} ${industryConfig.iconColor} border ${industryConfig.borderColor}`}>
              <IndustryIcon className="w-3.5 h-3.5" />
              <span>{industryConfig.label}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => toggleDropdown('notifications')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative" aria-label="Notifications">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
              </button>

              {openDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-primary-600 dark:text-gold-400 hover:underline flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">You're all caught up</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {notifications.map(n => (
                          <li key={n.id}>
                            <button
                              onClick={() => handleOpenNotification(n)}
                              className={`w-full text-left p-4 transition hover:bg-gray-50 dark:hover:bg-slate-700/50 ${n.is_read ? 'opacity-70' : 'bg-blue-50/50 dark:bg-slate-700/30'}`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!n.is_read ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>{n.title}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                                </div>
                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-600 mt-1 flex-shrink-0" />}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(o => !o)} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" aria-label="Account menu">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">{initials}</div>
                <div className="hidden lg:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">{displayName}</span>
                  <RoleBadge role={user?.role} size="xs" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email || ''}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <RoleBadge role={user?.role} size="xs" />
                      {user?.businessName && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">· {user.businessName}</span>}
                    </div>
                  </div>
                  <div className="py-1">
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">Profile Settings</Link>
                    <Link to="/subscription" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">Subscription</Link>
                    {canAccessSettings && (
                      <Link to="/settings" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">Settings</Link>
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-slate-700 py-1">
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:hidden mt-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {displayName} 👋
          </p>
        </div>
      </header>

      {/* Notification detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/40">
                  <Bell className="w-5 h-5 text-primary-600 dark:text-gold-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">{new Date(selected.created_at).toLocaleString()}</p>
            <button onClick={() => setSelected(null)} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHeader;