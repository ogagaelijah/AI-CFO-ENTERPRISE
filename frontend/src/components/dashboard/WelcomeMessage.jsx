// frontend/src/components/dashboard/WelcomeMessage.jsx
import { Link } from 'react-router-dom';
import { FileText, Package, Users, CreditCard, Bot } from 'lucide-react';

const CHIPS = [
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Debtors', href: '/debtors', icon: Users },
  { label: 'Creditors', href: '/creditors', icon: CreditCard },
  { label: 'AI Assistant', href: '/ai', icon: Bot },
];

const WelcomeMessage = ({ industryConfig }) => {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-4 sm:p-6 text-white">
      <h2 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">
        Welcome to AI CFO ENTERPRISE
      </h2>
      <p className="text-primary-100 text-xs sm:text-sm mb-3 sm:mb-4">
        Your complete business management platform for {industryConfig.label.toLowerCase()}.
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-3">
        {CHIPS.map((chip) => {
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