// frontend/src/components/admin/AdminSidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, Building2, CreditCard, DollarSign, 
  BarChart3, Activity, Settings, ArrowLeft, LogOut 
} from 'lucide-react';

const ALL_NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', href: '/admin', roles: ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS', 'TECHNICAL', 'HR', 'MARKETING', 'COMPLIANCE'] },
  { icon: Users, label: 'Users', href: '/admin/users', roles: ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'HR'] },
  { icon: Building2, label: 'Businesses', href: '/admin/businesses', roles: ['SUPERADMIN', 'ADMIN', 'OPERATIONS'] },
  { icon: CreditCard, label: 'Subscriptions', href: '/admin/subscriptions', roles: ['SUPERADMIN', 'ADMIN', 'FINANCE'] },
  { icon: DollarSign, label: 'Revenue', href: '/admin/revenue', roles: ['SUPERADMIN', 'ADMIN', 'FINANCE'] },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics', roles: ['SUPERADMIN', 'ADMIN', 'MARKETING'] },
  { icon: Activity, label: 'System Health', href: '/admin/health', roles: ['SUPERADMIN', 'ADMIN', 'TECHNICAL'] },
  { icon: Settings, label: 'Settings', href: '/admin/settings', roles: ['SUPERADMIN', 'ADMIN'] },
];

const AdminSidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const isSuperadmin = user?.platformRole === 'SUPERADMIN';
  
  // Filter nav items based on the user's role
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => 
    item.roles.includes(user?.platformRole) || isSuperadmin
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto fixed h-full z-40">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {user?.platformRole || 'ADMIN'}
        </span>
      </div>
      
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {isSuperadmin && (
          <Link to="/dashboard" className="flex items-center space-x-3 px-4 py-2.5 mb-4 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Return to My Business</span>
          </Link>
        )}
        
        {visibleNavItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <Link 
              key={index} 
              to={item.href} 
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition ${
                isActive 
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-4 truncate">{user?.email}</div>
        <button onClick={onLogout} className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full">
          <LogOut className="w-5 h-5" /><span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;