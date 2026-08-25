// src/pages/settings/SubscriptionTab.jsx
import { Link } from 'react-router-dom';
import { CheckCircle, CreditCard } from 'lucide-react';

const SubscriptionTab = ({ subscription }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">📋 Subscription</h2>
      {subscription ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{subscription.plan}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{subscription.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦{subscription.price.toLocaleString()}/month</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features Included</p>
            <ul className="space-y-1">
              {subscription.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/subscription"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Upgrade Plan
            </Link>
            <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">
              Cancel Subscription
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Loading subscription details...</p>
      )}
    </div>
  );
};

export default SubscriptionTab;