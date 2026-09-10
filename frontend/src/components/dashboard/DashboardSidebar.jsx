// frontend/src/components/dashboard/DashboardSidebar.jsx
import { Link } from 'react-router-dom';
import { X, LogOut, Home } from 'lucide-react';

const getSectionStyles = (label) => {
  if (label.includes('TRANSACTIONS')) {
    return {
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    };
  }
  if (label.includes('INTELLIGENCE')) {
    return {
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    };
  }
  if (label.includes('ACCOUNT')) {
    return {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    };
  }
  return { color: 'text-gray-400 dark:text-gray-500', bg: 'bg-transparent' };
};

const NavItem = ({ item, onClick, isMobile = false }) => {
  if (item.type === 'section') {
    const styles = getSectionStyles(item.label);
    return (
      <div
        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${styles.color} ${styles.bg} select-none`}
      >
        {item.label}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
        item.active
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      {item.icon && <item.icon className="w-5 h-5" />}
      <span className="text-sm">{item.label}</span>
    </Link>
  );
};

const DashboardSidebar = ({
  navItems,
  isMobileOpen,
  onMobileClose,
  onLogout,
}) => {
  // Desktop sidebar
  const DesktopSidebar = (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto fixed h-full z-40">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => (
          <NavItem key={index} item={item} />
        ))}
      </nav>
      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );

  // Mobile sidebar
  const MobileSidebar = isMobileOpen ? (
    <div
      className="md:hidden fixed inset-0 z-50 bg-black/50"
      onClick={onMobileClose}
    >
      <div
        className="w-72 h-full bg-white dark:bg-slate-800 p-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item, index) => (
            <NavItem key={index} item={item} onClick={onMobileClose} isMobile />
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
          <button
            onClick={() => {
              onLogout();
              onMobileClose();
            }}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {DesktopSidebar}
      {MobileSidebar}
    </>
  );
};

export default DashboardSidebar;