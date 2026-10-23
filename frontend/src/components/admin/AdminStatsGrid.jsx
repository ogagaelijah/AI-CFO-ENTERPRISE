// frontend/src/components/admin/AdminStatsGrid.jsx
import { Users, Building2, CreditCard, DollarSign } from 'lucide-react';

const AdminStatsGrid = ({ stats, totalBusinesses, platformRole }) => {
  const isSuperadmin = platformRole === 'SUPERADMIN';
  const isAdmin = platformRole === 'ADMIN';
  const isFinance = platformRole === 'FINANCE';
  
  // Determine what they can see
  const canSeeFinancials = isSuperadmin || isAdmin || isFinance;
  const canSeeUsers = isSuperadmin || isAdmin || platformRole === 'SUPPORT' || platformRole === 'HR';
  const canSeeBusinesses = isSuperadmin || isAdmin || platformRole === 'OPERATIONS';

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {canSeeUsers && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            {stats.usersGrowth > 0 && <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">↑ {stats.usersGrowth}%</span>}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalUsers}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
        </div>
      )}

      {canSeeBusinesses && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
          <div className="flex items-center justify-between"><div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"><Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{stats.activeBusinesses}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Businesses</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">out of {totalBusinesses} total</p>
        </div>
      )}

      {canSeeFinancials && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg"><DollarSign className="w-5 h-5 text-primary-600 dark:text-gold-400" /></div>
              {stats.revenueGrowth > 0 && <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">↑ {stats.revenueGrowth}%</span>}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">₦{stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
            <div className="flex items-center justify-between"><div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div></div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{stats.activeSubscriptions}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatsGrid;