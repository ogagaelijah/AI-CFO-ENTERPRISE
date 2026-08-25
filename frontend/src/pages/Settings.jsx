// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { User, Building2, CreditCard, LogOut, Home, Settings as SettingsIcon, Menu, X, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileTab from './settings/ProfileTab';
import BusinessTab from './settings/BusinessTab';
import SubscriptionTab from './settings/SubscriptionTab';
import { NAV_ITEMS } from './settings/SettingsSidebar';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({ fullName: '', email: '', phone: '' });
  const [businessData, setBusinessData] = useState({ name: '', industry: '' });
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Mock data - replace with API calls
    setProfileData({
      fullName: user?.fullName || 'User',
      email: user?.email || 'user@example.com',
      phone: user?.phoneNumber || '08012345678',
    });
    setBusinessData({
      name: user?.businessName || 'My Business',
      industry: user?.industry || 'Retail / Wholesale',
    });
    setSubscription({
      plan: 'Free',
      status: 'Active',
      price: 0,
      features: ['Sales Tracking', 'Inventory Management', 'Debtors & Creditors', 'Daily Reports'],
    });
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto fixed h-full z-40">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item, index) => (
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Settings</h1>
            </div>
            <div className="flex items-center space-x-2">
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
        </header>

        {/* Mobile Sidebar */}
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
                {NAV_ITEMS.map((item, index) => (
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

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Render Active Tab */}
          {!loading && (
            <>
              {activeTab === 'profile' && <ProfileTab profileData={profileData} setProfileData={setProfileData} />}
              {activeTab === 'business' && <BusinessTab businessData={businessData} setBusinessData={setBusinessData} industries={['Retail / Wholesale', 'Manufacturing', 'Construction', 'Healthcare', 'Consultancy', 'Real Estate', 'Education', 'Logistics']} />}
              {activeTab === 'subscription' && <SubscriptionTab subscription={subscription} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;