// frontend/src/components/dashboard/WelcomeMessage.jsx
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
        {['📊 Reports', '📦 Inventory', '👥 Debtors', '🏦 Creditors', '🤖 AI Assistant'].map(
          (label) => (
            <span
              key={label}
              className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm"
            >
              {label}
            </span>
          )
        )}
      </div>
    </div>
  );
};

export default WelcomeMessage;