// frontend/src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Moon, Sun, TrendingUp, TrendingDown, DollarSign, 
  Users, Package, AlertCircle, 
  BarChart3, FileText, ShoppingCart, Building2,
  LogOut, Home, Settings, Bell, 
  CreditCard, Truck, Briefcase, 
  Calendar, Brain, Layers, Lightbulb,
  Menu, X, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';
import { exportToPDF, exportToExcel } from '../services/exportService';
import ExecutiveReport from './reports/ExecutiveReport';

// Navigation items
const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: BarChart3, label: 'Reports', href: '/reports', active: true },
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

const Reports = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchReport = async (type, date = selectedDate) => {
    setIsLoading(true);
    setError(null);
    setReportData(null); // ✅ Clear previous data
    try {
      const dateStr = date.toISOString().split('T')[0];
      let endpoint = '';
      switch (type) {
        case 'daily': endpoint = `/reports/daily?date=${dateStr}`; break;
        case 'weekly': endpoint = `/reports/weekly?date=${dateStr}`; break;
        case 'monthly': endpoint = `/reports/monthly?date=${dateStr}`; break;
        case 'yearly': endpoint = `/reports/yearly?date=${dateStr}`; break;
        case 'executive': endpoint = '/reports/executive'; break;
        default: endpoint = `/reports/daily?date=${dateStr}`;
      }
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load report');
      }
    } catch (err) {
      console.error('Report error:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  const handleReportTypeChange = (type) => {
    setReportType(type);
  };

  const handleRefresh = () => {
    fetchReport(reportType);
  };

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    fetchReport(reportType, newDate);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  // Format currency
  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  // Render report content
  const renderReport = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading report...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No report data available</p>
        </div>
      );
    }

    // Check if this is an executive summary
    const isExecutive = reportType === 'executive';

    // Render executive summary
    if (isExecutive && reportData.executiveSummary) {
      return <ExecutiveReport data={reportData} />;
    }

    // Regular report (daily/weekly/monthly/yearly)
    const { period, revenue, costs, profitability, transactions, topProducts, topCustomers, customers, inventory, alerts } = reportData;

    return (
      <div className="space-y-6">
        {/* Period */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Period: {period.startDate} — {period.endDate}
          </p>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💰 Revenue</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sales</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(revenue.sales)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Other Income</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(revenue.income)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-gold-400">{formatCurrency(revenue.total)}</p>
            </div>
          </div>
        </div>

        {/* Costs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💸 Costs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Purchases</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(costs.purchases)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(costs.expenses)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Costs</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(costs.total)}</p>
            </div>
          </div>
        </div>

        {/* Profitability */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Profitability</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(profitability.grossProfit)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Margin: {profitability.grossMargin}%</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sales - COGS</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Operating Profit</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(profitability.operatingProfit)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Margin: {profitability.operatingMargin}%</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gross Profit - Expenses</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(profitability.netProfit)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Margin: {profitability.netMargin}%</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Operating Profit + Income</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Transactions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sales</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.sales}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Incomes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.incomes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.expenses}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Purchases</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.purchases}</p>
            </div>
          </div>
        </div>

        {/* Top 5 Products */}
        {topProducts && topProducts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📦 Top 5 Products</h3>
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{index + 1}. {product.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(product.revenue)} ({product.quantity} units)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 Customers */}
        {topCustomers && topCustomers.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👥 Top 5 Customers</h3>
            <div className="space-y-2">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{index + 1}. {customer.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(customer.total)} ({customer.count} purchases)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        {inventory && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📦 Inventory</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{inventory.totalItems}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Units</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{inventory.totalUnits}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(inventory.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Potential Profit</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(inventory.potentialProfit)}</p>
              </div>
            </div>
            {inventory.lowStockCount > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ {inventory.lowStockCount} item(s) low stock: {inventory.lowStockItems.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">⚠️ Alerts</h3>
            {alerts.map((alert, index) => (
              <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">{alert.message}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Reports</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
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

        {/* Reports Content */}
        <main className="flex-1 p-4 sm:p-6 space-y-4">
          {/* Report Type Selector */}
          <div className="flex flex-wrap gap-2">
            {['daily', 'weekly', 'monthly', 'yearly', 'executive'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setReportType(type);
                  setReportData(null); // ✅ Clear data when switching
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  reportType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          {reportType !== 'executive' && (
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600 dark:text-gray-400">Select Date:</label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleDateChange}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
              />
            </div>
          )}

          {/* Report Display */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {reportType} Report
              </h2>
              {reportData && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => exportToPDF(reportData, reportType)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => exportToExcel(reportData, reportType)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              )}
            </div>
            {renderReport()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;