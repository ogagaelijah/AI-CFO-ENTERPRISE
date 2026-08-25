// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Building2, CreditCard, DollarSign, 
  TrendingUp, TrendingDown, Calendar, 
  LogOut, Home, Settings, Bell, Moon, Sun,
  Menu, X, BarChart3, PieChart, Activity,
  Users as UsersIcon, Layers, Brain, Lightbulb,
  ArrowUp, ArrowDown
} from 'lucide-react';

// Common navigation items
const navItems = [
  { icon: Home, label: 'Dashboard', href: '/admin', active: true },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Building2, label: 'Businesses', href: '/admin/businesses' },
  { icon: CreditCard, label: 'Subscriptions', href: '/admin/subscriptions' },
  { icon: DollarSign, label: 'Revenue', href: '/admin/revenue' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Activity, label: 'System Health', href: '/admin/health' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

const AdminDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBusinesses: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    usersGrowth: 0,
    revenueGrowth: 0,
    industryDistribution: [],
    recentRegistrations: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // 🔄 MOCK DATA — Will connect to backend later
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setStats({
        totalUsers: 8,
        activeBusinesses: 6,
        totalRevenue: 25000,
        activeSubscriptions: 2,
        usersGrowth: 12.5,
        revenueGrowth: 8.3,
        industryDistribution: [
          { name: 'Retail / Wholesale', count: 3, color: 'bg-blue-500' },
          { name: 'Manufacturing', count: 2, color: 'bg-orange-500' },
          { name: 'Construction', count: 1, color: 'bg-amber-500' },
          { name: 'Healthcare', count: 1, color: 'bg-red-500' },
          { name: 'Consultancy', count: 0, color: 'bg-purple-500' },
          { name: 'Real Estate', count: 0, color: 'bg-emerald-500' },
          { name: 'Education', count: 1, color: 'bg-indigo-500' },
          { name: 'Logistics', count: 0, color: 'bg-cyan-500' },
        ],
        recentRegistrations: [
          { id: 8, name: 'Test Education Co', email: 'education@example.com', industry: 'Education', date: '2026-08-24' },
          { id: 7, name: 'Test RealEstate Co', email: 'realestate@example.com', industry: 'Real Estate', date: '2026-08-24' },
          { id: 6, name: 'Test Consultancy Co', email: 'consultancy@example.com', industry: 'Consultancy', date: '2026-08-24' },
          { id: 5, name: 'Test Healthcare Co', email: 'healthcare@example.com', industry: 'Healthcare', date: '2026-08-24' },
        ],
      });
      setIsLoading(false);
    };
    loadData();
  }, []);

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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate total from industry distribution
  const totalBusinesses = stats.industryDistribution.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto fixed h-full z-40">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ADMIN</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
                item.active
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-4">
            {user?.email || 'admin@aicfo.com'}
          </div>
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 border border-primary-200 dark:border-primary-800">
                <Activity className="w-3.5 h-3.5" />
                <span>Platform Admin</span>
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
                  A
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={closeMenu}>
            <div className="w-72 h-full bg-white dark:bg-slate-800 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ADMIN</span>
                </div>
                <button onClick={closeMenu} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
              <nav className="space-y-0.5">
                {navItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
                      item.active
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={closeMenu}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </a>
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
          <div className="rounded-xl p-4 sm:p-6 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 text-white">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Welcome to Admin Dashboard</h2>
                <p className="text-primary-100 text-sm">
                  Track platform growth, user activity, and business performance across all 8 industries.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Users */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  ↑ {stats.usersGrowth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                {stats.totalUsers}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
            </div>

            {/* Active Businesses */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                {stats.activeBusinesses}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Businesses</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                out of {totalBusinesses} total
              </p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary-600 dark:text-gold-400" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  ↑ {stats.revenueGrowth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                {stats.activeSubscriptions}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
            </div>
          </div>

          {/* Industry Distribution & Recent Registrations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Industry Distribution */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Industry Distribution</h2>
              <div className="space-y-3">
                {stats.industryDistribution.map((industry, index) => {
                  const percentage = totalBusinesses > 0 ? (industry.count / totalBusinesses) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate">
                        {industry.name}
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${industry.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                        {industry.count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Businesses: {totalBusinesses}
                </p>
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Registrations</h2>
              {stats.recentRegistrations.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{reg.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reg.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {reg.industry}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{reg.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent registrations</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href="/admin/users"
                className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
              >
                <UsersIcon className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">View Users</span>
              </a>
              <a
                href="/admin/businesses"
                className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
              >
                <Building2 className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">View Businesses</span>
              </a>
              <a
                href="/admin/subscriptions"
                className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
              >
                <CreditCard className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Manage Plans</span>
              </a>
              <a
                href="/admin/analytics"
                className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
              >
                <BarChart3 className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Analytics</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;