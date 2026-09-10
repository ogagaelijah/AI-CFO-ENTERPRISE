// frontend/src/pages/Dashboard.jsx
import { useState } from 'react';
import { Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INDUSTRY_CONFIGS } from '../config/industryConfig';
import { useDashboardData } from '../hooks/useDashboardData';

// Components
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import StatsGrid from '../components/dashboard/StatsGrid';
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import TopRisksCard from '../components/dashboard/TopRisksCard';
import TopDecisionsCard from '../components/dashboard/TopDecisionsCard';
import QuickActions from '../components/dashboard/QuickActions';
import IndustryFeatures from '../components/dashboard/IndustryFeatures';
import WelcomeMessage from '../components/dashboard/WelcomeMessage';

// Normalize industry keys
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
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userIndustry = normalizeIndustry(user?.industry || 'RETAIL');
  const industryConfig = INDUSTRY_CONFIGS[userIndustry] || INDUSTRY_CONFIGS.RETAIL;
  const IndustryIcon = industryConfig.icon;

  const {
    kpis,
    healthScore,
    topRisks,
    topDecisions,
    isLoading,
    error,
    refresh,
  } = useDashboardData();

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    ...(industryConfig.sidebar || []),
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
      <DashboardSidebar
        navItems={navItems}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMenu}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <DashboardHeader
          user={user}
          industryConfig={industryConfig}
          IndustryIcon={IndustryIcon}
          isMobileMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={refresh}
                className="text-xs font-medium underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          <WelcomeBanner
            user={user}
            industryConfig={industryConfig}
            IndustryIcon={IndustryIcon}
          />

          <StatsGrid industryConfig={industryConfig} kpis={kpis} />

          {/* Intelligence Row: Health + Risks + Decisions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <HealthScoreCard healthScore={healthScore} />
            <TopRisksCard risks={topRisks} />
            <TopDecisionsCard decisions={topDecisions} />
          </div>

          <QuickActions industryConfig={industryConfig} />

          <IndustryFeatures industryConfig={industryConfig} />

          <WelcomeMessage industryConfig={industryConfig} />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;