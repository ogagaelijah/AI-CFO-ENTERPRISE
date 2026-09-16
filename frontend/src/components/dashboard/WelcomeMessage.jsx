// frontend/src/components/dashboard/WelcomeMessage.jsx
// v2.0.0-prod — chips driven by industryConfig.features (not hardcoded)

import { Link } from 'react-router-dom';
import {
  FileText, Package, Users, CreditCard, Bot, Briefcase, Clock,
  Receipt, BarChart3, Building2, Truck, GraduationCap, Stethoscope,
  Home as HomeIcon,
} from 'lucide-react';

// Maps a feature label to an icon + route.
// Adding a new industry feature = add one line here.
const FEATURE_META = {
  // Common
  'Reports':         { icon: FileText,      href: '/reports' },
  'Analytics':       { icon: BarChart3,     href: '/analytics' },
  'AI Assistant':    { icon: Bot,           href: '/ai' },
  'Inventory':       { icon: Package,       href: '/inventory' },
  'Debtors':         { icon: Users,         href: '/debtors' },
  'Creditors':       { icon: CreditCard,    href: '/creditors' },
  'Customers':       { icon: Users,         href: '/customers' },
  'Suppliers':       { icon: Truck,         href: '/suppliers' },
  // Retail / Wholesale
  'Sales':           { icon: BarChart3,     href: '/sales' },
  'Purchases':       { icon: Package,       href: '/purchases' },
  // Consultancy
  'Clients':         { icon: Users,         href: '/clients' },
  'Billable Hours':  { icon: Clock,         href: '/hours' },
  'Projects':        { icon: Briefcase,     href: '/projects' },
  'Invoices':        { icon: Receipt,       href: '/invoices' },
  // Healthcare
  'Patients':        { icon: Stethoscope,   href: '/patients' },
  'Patient Visits':  { icon: Stethoscope,   href: '/visits' },
  'Medical Supplies':{ icon: Package,       href: '/inventory' },
  'Billing':         { icon: Receipt,       href: '/invoices' },
  // Education
  'Students':        { icon: GraduationCap, href: '/students' },
  'Classes':         { icon: GraduationCap, href: '/classes' },
  'School Fees':     { icon: Receipt,       href: '/fees' },
  'Exams':           { icon: FileText,      href: '/exams' },
  // Real Estate
  'Properties':      { icon: HomeIcon,      href: '/properties' },
  'Tenants':         { icon: Users,         href: '/tenants' },
  'Rent Collection': { icon: Receipt,       href: '/rent' },
  'Maintenance':     { icon: Package,       href: '/maintenance' },
  // Logistics
  'Vehicles':        { icon: Truck,         href: '/vehicles' },
  'Drivers':         { icon: Users,         href: '/drivers' },
  'Trips':           { icon: Truck,         href: '/trips' },
  'Trip Revenue':    { icon: Receipt,       href: '/trips' },
  // Manufacturing
  'Raw Materials':   { icon: Package,       href: '/inventory' },
  'Production':      { icon: Package,       href: '/production' },
  // Construction
  'Materials':       { icon: Package,       href: '/inventory' },
  'Project Billing': { icon: Receipt,       href: '/invoices' },
};

const FALLBACK_CHIPS = [
  { label: 'Reports',      href: '/reports', icon: FileText },
  { label: 'AI Assistant', href: '/ai',      icon: Bot },
];

const WelcomeMessage = ({ industryConfig }) => {
  const featureLabels = industryConfig?.features || [];

  const chips = featureLabels
    .map((label) => {
      const meta = FEATURE_META[label];
      if (!meta) return null;
      return { label, href: meta.href, icon: meta.icon };
    })
    .filter(Boolean);

  const finalChips = chips.length > 0 ? chips : FALLBACK_CHIPS;

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-4 sm:p-6 text-white">
      <h2 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">
        Welcome to AI CFO ENTERPRISE
      </h2>
      <p className="text-primary-100 text-xs sm:text-sm mb-3 sm:mb-4">
        Your complete business management platform for {industryConfig.label.toLowerCase()}.
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-3">
        {finalChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Link
              key={chip.label}
              to={chip.href}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs sm:text-sm transition"
            >
              <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              {chip.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default WelcomeMessage;