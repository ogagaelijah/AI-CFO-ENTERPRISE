// frontend/src/pages/Dashboard.jsx
// v2.5.0-prod — Uses getSidebarItems to inject Platform Admin links.

import { useState } from 'react';
import { Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import useRole from '../hooks/useRole';
import { INDUSTRY_CONFIGS, getSidebarItems } from '../config/industryConfig';
import { useDashboardData } from '../hooks/useDashboardData';

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
import TrialBanner from '../components/subscription/TrialBanner';
import ReadOnlyBanner from '../components/subscription/ReadOnlyBanner';
import VerifyEmailBanner from '../components/dashboard/VerifyEmailBanner';

const normalizeIndustry = (industry) => {
  if (!industry) return 'RETAIL';
  const upper = industry.toUpperCase().replace(/[-\s/]+/g, '_');
  const map = {
    RETAIL: 'RETAIL',
    RETAIL_WHOLESALE: 'RETAIL',
    MANUFACTURING: 'MANUFACTURING',
    CONSTRUCTION: 'CONSTRUCTION',
    HEALTHCARE: 'HEALTHCARE',
    CONSULTANCY: 'CONSULTANCY',
    CONSULTANCY_SERVICES: 'CONSULTANCY',
    CONSULTING: 'CONSULTANCY',
    SERVICES: 'CONSULTANCY',
    REAL_ESTATE: 'REAL_ESTATE',
    EDUCATION: 'EDUCATION',
    LOGISTICS: 'LOGISTICS',
    NGO: 'NGO',
    NGO_NON_PROFIT: 'NGO',
    NON_PROFIT: 'NGO',
  };
  return map[upper] || 'RETAIL';
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { can, isTrial, isReadOnly, daysRemaining, planName } = usePlan();
  const { canViewFinancialWidgets } = useRole();
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

  // ★ NEW: Build nav items and inject platform links if applicable
  const baseNavItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    ...(industryConfig.sidebar || []),
  ];
  
  const navItems = getSidebarItems(baseNavItems, user);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  const showIntelligenceWidgets = can('analytics') && canViewFinancialWidgets;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex overflow-x-hidden">
      <DashboardSidebar
        navItems={navItems}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMenu}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen md:ml-64 min-w-0">
        <DashboardHeader
          user={user}
          industryConfig={industryConfig}
          IndustryIcon={IndustryIcon}
          isMobileMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 min-w-0">
          {isReadOnly ? (
            <ReadOnlyBanner />
          ) : isTrial ? (
            <TrialBanner daysRemaining={daysRemaining} planName={planName} />
          ) : null}

          <VerifyEmailBanner />

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

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <StatsGrid industryConfig={industryConfig} kpis={kpis} />

              {showIntelligenceWidgets && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <HealthScoreCard healthScore={healthScore} />
                  <TopRisksCard risks={topRisks} />
                  <TopDecisionsCard decisions={topDecisions} />
                </div>
              )}

              <QuickActions industryConfig={industryConfig} />
              <IndustryFeatures industryConfig={industryConfig} />
              <WelcomeMessage industryConfig={industryConfig} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;