// frontend/src/components/dashboard/DashboardHeader.jsx
import { Menu, X, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DashboardHeader = ({
  user,
  industryConfig,
  IndustryIcon,
  isMobileMenuOpen,
  onMenuToggle,
}) => {
  const { theme, toggleTheme } = useTheme();

  const getPlanBadge = () => {
    const planStyles = {
      pro: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-gold-400 border-primary-200 dark:border-primary-800',
      business: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      free: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 border-gray-200 dark:border-slate-600',
    };

    const planLabels = {
      pro: '⭐ Pro',
      business: '🏢 Business',
      free: '📋 Free',
    };

    const plan = user?.plan || 'free';
    return (
      <div
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${planStyles[plan]}`}
      >
        {planLabels[plan]}
      </div>
    );
  };

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 md:hidden">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <span className="text-xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
        </div>

        <div className="flex-1 md:flex-none">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {getPlanBadge()}

          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${industryConfig.bgColor} ${industryConfig.iconColor} border ${industryConfig.borderColor}`}
          >
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
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gold-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">
              {user?.fullName || 'User'}
            </span>
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