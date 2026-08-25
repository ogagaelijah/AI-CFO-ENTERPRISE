// src/pages/Dashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut, Home, Bell, Sun, Moon, Settings } from 'lucide-react';
import { INDUSTRY_CONFIGS, COMMON_NAV_ITEMS, STAT_COLORS } from '../config/industryConfig';
import { useDashboardData } from '../hooks/useDashboardData';

// Normalize industry keys to match config
const normalizeIndustry = (industry) => {
  if (!industry) return 'RETAIL';
  const upper = industry.toUpperCase();
  const map = {
    'RETAIL': 'RETAIL',
    'RETAIL / WHOLESALE': 'RETAIL',
    'MANUFACTURING': 'MANUFACTURING',
    'CONSTRUCTION': 'CONSTRUCTION',
    'HEALTHCARE': 'HEALTHCARE',
    'CONSULTANCY': 'CONSULTANCY',
    'REAL ESTATE': 'REAL_ESTATE',
    'REAL_ESTATE': 'REAL_ESTATE',
    'EDUCATION': 'EDUCATION',
    'LOGISTICS': 'LOGISTICS',
  };
  return map[upper] || 'RETAIL';
};

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Normalize industry
  const rawIndustry = user?.industry || 'RETAIL';
  const userIndustry = normalizeIndustry(rawIndustry);
  const industryConfig = INDUSTRY_CONFIGS[userIndustry] || INDUSTRY_CONFIGS['RETAIL'];
  const IndustryIcon = industryConfig.icon;

  const { stats, isLoading } = useDashboardData(userIndustry);

  // Build navItems with Reports pointing to /reports and Settings pointing to /settings
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    ...(industryConfig.sidebar || []),
    // Override Reports and Settings to use React Router links
    ...COMMON_NAV_ITEMS.map(item => {
      if (item.label === 'Reports') {
        return { ...item, href: '/reports' };
      }
      if (item.label === 'Settings') {
        return { ...item, href: '/settings' };
      }
      return item;
    }),
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto fixed h-full z-40">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
                item.active
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
              </button>
              <span className="text-xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
            </div>
            <div className="flex-1 md:flex-none">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* Plan Badge */}
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                user?.plan === 'pro' 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-gold-400 border-primary-200 dark:border-primary-800' 
                  : user?.plan === 'business' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
                    : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 border-gray-200 dark:border-slate-600'
              }`}>
                {user?.plan === 'pro' && '⭐ Pro'}
                {user?.plan === 'business' && '🏢 Business'}
                {(!user?.plan || user?.plan === 'free') && '📋 Free'}
              </div>

              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${industryConfig.bgColor} ${industryConfig.iconColor} border ${industryConfig.borderColor}`}>
                <IndustryIcon className="w-3.5 h-3.5" />
                <span>{industryConfig.label}</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">{user?.fullName || 'User'}</span>
              </div>
            </div>
          </div>
          <div className="md:hidden mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.fullName || 'User'} 👋
            </p>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={closeMenu}>
            <div className="w-72 h-full bg-white dark:bg-slate-800 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
                </div>
                <button onClick={closeMenu} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
              <nav className="space-y-0.5">
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
                      item.active
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={closeMenu}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                <button
                  onClick={() => { handleLogout(); closeMenu(); }}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Welcome Banner */}
          <div className={`rounded-xl p-4 sm:p-6 ${industryConfig.bgColor} border ${industryConfig.borderColor}`}>
            <div className="flex items-start sm:items-center gap-4">
              <div className={`p-3 rounded-xl ${industryConfig.bgColor} ${industryConfig.iconColor}`}>
                <IndustryIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {industryConfig.label} Dashboard
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, {user?.fullName || 'User'}! Here's what's happening with your {industryConfig.label.toLowerCase()} business.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {industryConfig.stats.map((stat, index) => {
              const value = stats?.[stat.key];
              const StatIcon = stat.icon;
              const colorClass = STAT_COLORS[stat.color] || STAT_COLORS.primary;

              let displayValue = '0';
              if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                  displayValue = value.total || value.month || value || 0;
                } else {
                  displayValue = value;
                }
              }

              const isCurrency = ['revenue', 'inventory', 'raw_materials', 'materials', 'rent', 'fees'].includes(stat.key);

              return (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${colorClass}`}>
                      <StatIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    {value?.growth !== undefined && value.growth !== null && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                        ↑ {value.growth}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 truncate">
                    {isCurrency ? `₦${Number(displayValue).toLocaleString()}` : displayValue}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  {value?.today !== undefined && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1">
                      {isCurrency ? `₦${value.today.toLocaleString()}` : `${value.today}`} today
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Quick Actions for {industryConfig.label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {industryConfig.quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.href}
                    className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
                  >
                    <ActionIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-gold-400 mb-1 sm:mb-2" />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Industry Features */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {industryConfig.label} Features
            </h2>
            <div className="flex flex-wrap gap-2">
              {industryConfig.features.map((feature, index) => (
                <span
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${industryConfig.bgColor} ${industryConfig.iconColor}`}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-4 sm:p-6 text-white">
            <h2 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Welcome to AI CFO ENTERPRISE</h2>
            <p className="text-primary-100 text-xs sm:text-sm mb-3 sm:mb-4">
              Your complete business management platform for {industryConfig.label.toLowerCase()}.
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-3">
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">📊 Reports</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">📦 Inventory</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">👥 Debtors</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">🏦 Creditors</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">🤖 AI Assistant</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;