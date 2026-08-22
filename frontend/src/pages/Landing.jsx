// frontend/src/pages/Landing.jsx
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, TrendingUp, Package, Users, FileText, BarChart3, Zap, ChevronRight, Check, Menu, X } from 'lucide-react';

const Landing = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.fade-in');
      elements.forEach((el) => {
        observer.observe(el);
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('visible');
        }
      });
    }, 100);

    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-in:not(.visible)');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 50) {
          el.classList.add('visible');
        }
      });
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu when clicking a link
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">ENTERPRISE</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition">Features</a>
              <a href="#industries" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition">Industries</a>
              <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition">Pricing</a>
            </nav>

            {/* Desktop Right Side */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <a
                href="/login"
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-gold-400 hover:underline transition"
              >
                Log in
              </a>
              <a
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-gold-500 dark:text-slate-900 rounded-lg hover:bg-primary-700 dark:hover:bg-gold-600 transition shadow-md hover:shadow-lg"
              >
                Sign up free
              </a>
            </div>

            {/* Mobile: Theme Toggle + Menu Button */}
            <div className="flex items-center space-x-2 md:hidden">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#features"
                className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition py-2"
                onClick={closeMenu}
              >
                Features
              </a>
              <a
                href="#industries"
                className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition py-2"
                onClick={closeMenu}
              >
                Industries
              </a>
              <a
                href="#pricing"
                className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-gold-400 transition py-2"
                onClick={closeMenu}
              >
                Pricing
              </a>
              <hr className="border-gray-200 dark:border-slate-700" />
              <a
                href="/login"
                className="block text-primary-600 dark:text-gold-400 font-medium py-2"
                onClick={closeMenu}
              >
                Log in
              </a>
              <a
                href="/register"
                className="block text-center text-white bg-primary-600 dark:bg-gold-500 dark:text-slate-900 rounded-lg px-4 py-3 font-medium"
                onClick={closeMenu}
              >
                Sign up free
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center fade-in visible">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 text-sm font-medium mb-6 border border-primary-200 dark:border-primary-700">
            <Zap className="w-4 h-4 mr-2" />
            Built for African SMEs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Manage your business like a <span className="text-primary-600 dark:text-gold-400">CFO</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            AI CFO ENTERPRISE helps African SMEs track sales, inventory, debtors, and profits — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/register"
              className="px-8 py-4 text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center"
            >
              Create your account
              <ChevronRight className="w-5 h-5 ml-2" />
            </a>
            <a
              href="#features"
              className="px-8 py-4 text-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition inline-flex items-center justify-center"
            >
              See how it works
            </a>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Free to start — no card required.</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 fade-in">
            Everything you need to run your business
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: 'Sales & Income', desc: 'Record sales, track income, and monitor revenue in real-time.' },
              { icon: Package, title: 'Inventory Management', desc: 'Track stock levels, get low stock alerts, and manage suppliers.' },
              { icon: Users, title: 'Debtors & Creditors', desc: 'Manage who owes you and who you owe — never miss a payment.' },
              { icon: FileText, title: 'Reports & Analytics', desc: 'Daily, weekly, monthly, and yearly reports with profit margins.' },
              { icon: BarChart3, title: 'Forecasting & AI', desc: 'Predict future revenue and get AI-powered business recommendations.' },
              { icon: Zap, title: '8 Industries Supported', desc: 'Retail, Manufacturing, Construction, Healthcare, and more.' },
            ].map((feature, index) => (
              <div key={index} className="card group fade-in" style={{ transitionDelay: `${index * 100}ms` }}>
                <feature.icon className="w-10 h-10 text-primary-600 dark:text-gold-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 px-4 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 fade-in">Built for 8 Industries</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-12 fade-in">
            One platform that adapts to your industry's unique needs.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Retail / Wholesale',
              'Manufacturing',
              'Construction',
              'Healthcare',
              'Consultancy',
              'Real Estate',
              'Education',
              'Logistics',
            ].map((industry, index) => (
              <div key={index} className="card bg-white dark:bg-slate-800 p-4 text-center fade-in" style={{ transitionDelay: `${index * 80}ms` }}>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{industry}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 fade-in">Simple, transparent pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                name: 'Free', 
                price: '₦0', 
                desc: 'For small businesses getting started',
                features: ['Basic sales tracking', 'Inventory management', 'Debtors & creditors', 'Daily reports'],
                cta: 'Get Started',
                popular: false
              },
              { 
                name: 'Pro', 
                price: '₦5,000', 
                desc: 'For growing businesses',
                features: ['All Free features', 'Unlimited transactions', 'Priority support', 'Forecasting & AI'],
                cta: 'Upgrade Now',
                popular: true
              },
              { 
                name: 'Business', 
                price: '₦15,000', 
                desc: 'For large businesses',
                features: ['All Pro features', 'Multi-user access', 'Advanced AI insights', 'Dedicated account manager'],
                cta: 'Upgrade Now',
                popular: false
              },
            ].map((plan, index) => (
              <div key={index} className={`card ${plan.popular ? 'border-2 border-primary-500 dark:border-gold-400 shadow-lg relative' : ''} text-center fade-in`} style={{ transitionDelay: `${index * 150}ms` }}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white bg-primary-500 dark:bg-gold-500 dark:text-slate-900 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-4xl font-bold text-primary-600 dark:text-gold-400 my-4">{plan.price}<span className="text-base font-normal text-gray-500 dark:text-gray-400">/month</span></p>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{plan.desc}</p>
                <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.name === 'Free' ? '/register' : '/register?plan=' + plan.name.toLowerCase()}
                  className={`block w-full py-3 rounded-lg font-medium transition text-center ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-bold text-white mb-4">AI CFO <span className="text-gold-400">ENTERPRISE</span></div>
          <p className="text-gray-400 mb-6">Built for African SMEs 🇳🇬</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            © 2026 AI CFO ENTERPRISE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;