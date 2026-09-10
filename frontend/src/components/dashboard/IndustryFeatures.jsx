// frontend/src/components/dashboard/IndustryFeatures.jsx
const IndustryFeatures = ({ industryConfig }) => {
  if (!industryConfig?.features || industryConfig.features.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
        {industryConfig.label} Features
      </h2>
      <div className="flex flex-wrap gap-2">
        {industryConfig.features.map((feature, index) => (
          <span
            key={index}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${industryConfig.bgColor} ${industryConfig.iconColor}`}
          >
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
};

export default IndustryFeatures;