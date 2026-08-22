// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  Moon, Sun, TrendingUp, TrendingDown, DollarSign, 
  Users, Package, AlertCircle, ChevronRight, 
  BarChart3, FileText, ShoppingCart, Building2,
  LogOut, Home, Settings, Bell, 
  CreditCard, Truck, Briefcase, Sparkles, 
  PieChart, Calendar, Brain, Layers, Lightbulb
} from 'lucide-react';

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState({
    revenue: { today: 0, month: 0, growth: 0 },
    sales: { today: 0, month: 0, growth: 0 },
    expenses: { today: 0, month: 0, growth: 0 },
    debtors: { total: 0, overdue: 0 },
    creditors: { total: 0, overdue: 0 },
    inventory: { total: 0, lowStock: 0 },
    purchases: { today: 0, month: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState({ name: 'User', email: '' });

  useEffect(() => {
    // 🔄 MOCK DATA — Simulate API call
    const loadDashboard = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setStats({
        revenue: { today: 16800, month: 672000, growth: 12.5 },
        sales: { today: 3, month: 42, growth: 8.3 },
        expenses: { today: 3200, month: 128000, growth: 3.2 },
        debtors: { total: 35120, overdue: 7 },
        creditors: { total: 25530, overdue: 6 },
        inventory: { total: 1200000, lowStock: 2 },
        purchases: { today: 0, month: 16 },
      });
      
      setUser({ 
        name: 'Nifemi', 
        email: 'nifemi@example.com' 
      });
      
      setIsLoading(false);
    };
    
    loadDashboard();
  }, []);

  const handleLogout = () => {
    window.location.href = '/login';
  };

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

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: BarChart3, label: 'Reports', href: '/reports' },
    { icon: TrendingUp, label: 'Sales', href: '/sales' },
    { icon: DollarSign, label: 'Income', href: '/income' },
    { icon: TrendingDown, label: 'Expenses', href: '/expenses' },
    { icon: ShoppingCart, label: 'Purchases', href: '/purchases' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: Users, label: 'Debtors', href: '/debtors' },
    { icon: CreditCard, label: 'Creditors', href: '/creditors' },
    { icon: Building2, label: 'Customers', href: '/customers' },
    { icon: Truck, label: 'Suppliers', href: '/suppliers' },
    { icon: Briefcase, label: 'Projects', href: '/projects' },
    { icon: Calendar, label: 'Forecast', href: '/forecast' },
    { icon: Lightbulb, label: 'Recommendations', href: '/recommendations' },
    { icon: Brain, label: 'AI Assistant', href: '/ai' },
    { icon: Layers, label: 'Subscription', href: '/subscription' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 overflow-y-auto">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ENTERPRISE</span>
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name} 👋
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary-600 dark:text-gold-400" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  ↑ {stats.revenue.growth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.revenue.month.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenue this month</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                ₦{stats.revenue.today.toLocaleString()} today
              </p>
            </div>

            {/* Sales */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  ↑ {stats.sales.growth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                {stats.sales.month}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sales this month</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.sales.today} today
              </p>
            </div>

            {/* Expenses */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-xs font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                  ↑ {stats.expenses.growth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.expenses.month.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expenses this month</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                ₦{stats.expenses.today.toLocaleString()} today
              </p>
            </div>

            {/* Purchases */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                {stats.purchases.month}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Purchases this month</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.purchases.today} today
              </p>
            </div>
          </div>

          {/* Second Row: Debtors, Creditors, Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Debtors */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                {stats.debtors.overdue > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                    ⚠️ {stats.debtors.overdue} overdue
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.debtors.total.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total debtors</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.debtors.overdue} overdue accounts
              </p>
            </div>

            {/* Creditors */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                {stats.creditors.overdue > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                    ⚠️ {stats.creditors.overdue} overdue
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.creditors.total.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total creditors</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.creditors.overdue} overdue accounts
              </p>
            </div>

            {/* Inventory */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                  <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                {stats.inventory.lowStock > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                    ⚠️ {stats.inventory.lowStock} low
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                ₦{stats.inventory.total.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inventory value</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.inventory.lowStock} items low stock
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/sales/record" className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Record Sale</span>
              </Link>
              <Link to="/inventory/add" className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                <Package className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Add Stock</span>
              </Link>
              <Link to="/debtors/pay" className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                <Users className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Record Payment</span>
              </Link>
              <Link to="/reports/daily" className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                <FileText className="w-6 h-6 text-primary-600 dark:text-gold-400 mb-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">View Reports</span>
              </Link>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-6 text-white">
            <h2 className="text-xl font-bold mb-2">Welcome to AI CFO ENTERPRISE</h2>
            <p className="text-primary-100 mb-4">
              Your complete business management platform. Track sales, income, expenses, purchases, inventory, debtors, creditors, and more.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📊 Reports</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📦 Inventory</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">👥 Debtors</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🏦 Creditors</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🤖 AI Assistant</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;