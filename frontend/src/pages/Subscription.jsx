// frontend/src/pages/Subscription.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { 
  Moon, Sun, Home, BarChart3, FileText, ShoppingCart, Building2,
  LogOut, Settings, Bell, CreditCard, Truck, Briefcase,
  Calendar, Brain, Layers, Lightbulb, Menu, X
} from 'lucide-react';
import { paymentApi } from '../services/paymentService';

// Navigation items
const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: FileText, label: 'Sales', href: '/sales' },
  { icon: ShoppingCart, label: 'Purchases', href: '/purchases' },
  { icon: Building2, label: 'Customers', href: '/customers' },
  { icon: Truck, label: 'Suppliers', href: '/suppliers' },
  { icon: Briefcase, label: 'Projects', href: '/projects' },
  { icon: Calendar, label: 'Forecast', href: '/forecast' },
  { icon: Lightbulb, label: 'Recommendations', href: '/recommendations' },
  { icon: Brain, label: 'AI Assistant', href: '/ai' },
  { icon: Layers, label: 'Subscription', href: '/subscription', active: true },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

const Subscription = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');

  const plans = [
    { 
      id: 'free', 
      name: 'Free', 
      price: 0, 
      features: ['Basic sales tracking', 'Inventory management', 'Debtors & creditors', 'Daily reports'] 
    },
    { 
      id: 'pro', 
      name: 'Pro', 
      price: 5000, 
      features: ['All Free features', 'Unlimited transactions', 'Priority support', 'Forecasting & AI'],
      popular: true
    },
    { 
      id: 'business', 
      name: 'Business', 
      price: 15000, 
      features: ['All Pro features', 'Multi-user access', 'Advanced AI insights', 'Dedicated account manager'] 
    },
  ];

  const handleUpgrade = async (plan) => {
    if (plan.id === 'free' || plan.id === currentPlan) {
      return;
    }

    setLoading(true);
    try {
      const response = await paymentApi.initialize({
        plan: plan.id,
        email: user?.email,
        amount: plan.price,
      });

      if (response.data.success) {
        // Redirect to Flutterwave checkout
        window.location.href = response.data.data.link;
      } else {
        alert(response.data.message || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Subscription</h1>
            </div>
            <div className="flex items-center space-x-2">
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

        {/* Subscription Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
              <p className="text-gray-600 dark:text-gray-400">Upgrade to unlock more features and grow your business.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6 relative ${
                    currentPlan === plan.id 
                      ? 'border-primary-500 dark:border-gold-400 shadow-lg' 
                      : plan.popular 
                        ? 'border-primary-500 dark:border-gold-400 shadow-lg' 
                        : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white bg-primary-500 dark:bg-gold-500 dark:text-slate-900 rounded-full">
                      Most Popular
                    </span>
                  )}
                  {currentPlan === plan.id && (
                    <span className="absolute -top-3 right-4 px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      Current Plan
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-3xl font-bold text-primary-600 dark:text-gold-400 my-4">
                    ₦{plan.price.toLocaleString()}
                    {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loading || currentPlan === plan.id}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                      currentPlan === plan.id
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : plan.id === 'free'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {currentPlan === plan.id 
                      ? '✅ Current Plan' 
                      : plan.id === 'free' 
                        ? 'Get Started' 
                        : loading 
                          ? 'Processing...' 
                          : 'Upgrade Now'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                🔒 Secure payments powered by Flutterwave. All plans include a 30-day free trial.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Subscription;