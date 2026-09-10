// frontend/src/components/dashboard/WelcomeBanner.jsx
const WelcomeBanner = ({ user, industryConfig, IndustryIcon }) => {
  return (
    <div className={`rounded-xl p-4 sm:p-6 ${industryConfig.bgColor} border ${industryConfig.borderColor}`}>
      <div className="flex items-start sm:items-center gap-4">
        <div className={`p-3 rounded-xl ${industryConfig.bgColor} ${industryConfig.iconColor}`}>
          <IndustryIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {industryConfig.label} Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {user?.fullName || 'User'}! Here's what's happening with your{' '}
            {industryConfig.label.toLowerCase()} business.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;