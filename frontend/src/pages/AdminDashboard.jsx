// frontend/src/pages/AdminDashboard.jsx
// v1.9.1-prod — Fixes dark mode text visibility for role dropdown.

import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { platformApi } from '../services/api';
import { useLocation } from 'react-router-dom';
import { 
  Bell, Moon, Sun, Menu, X, Activity, AlertCircle, 
  Plus, Loader2, Copy, Check, Users, Trash2 
} from 'lucide-react';

import AdminSidebar from '../components/admin/AdminSidebar';
import AdminStatsGrid from '../components/admin/AdminStatsGrid';

const ROLE_OPTIONS = ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'TECHNICAL', 'OPERATIONS', 'MARKETING', 'HR', 'COMPLIANCE', 'FINANCE'];

const AdminDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Hire Modal State
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireEmail, setHireEmail] = useState('');
  const [hireRole, setHireRole] = useState('SUPPORT');
  const [isHiring, setIsHiring] = useState(false);
  const [hireError, setHireError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Manage Staff State
  const [showManageModal, setShowManageModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isFiring, setIsFiring] = useState(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0, activeBusinesses: 0, totalRevenue: 0, activeSubscriptions: 0,
    usersGrowth: 0, revenueGrowth: 0, industryDistribution: [], recentRegistrations: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await platformApi.getStats();
        if (res.data?.success) setStats(res.data.data);
        else setError('Failed to load platform stats');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to connect to the platform API');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const handleHireStaff = async (e) => {
    e.preventDefault();
    setIsHiring(true);
    setHireError('');
    setInviteLink('');
    try {
      const res = await platformApi.hireStaff(hireEmail, hireRole);
      
      if (res.data?.status === 'promoted') {
        alert(res.data.message);
        setShowHireModal(false);
        setHireEmail('');
      } else if (res.data?.status === 'invited') {
        setInviteLink(res.data.inviteUrl);
      }
    } catch (err) {
      setHireError(err.response?.data?.message || 'Failed to hire staff');
    } finally {
      setIsHiring(false);
    }
  };

  const handleOpenManage = async () => {
    setShowManageModal(true);
    setIsLoadingStaff(true);
    try {
      const res = await platformApi.getStaff();
      if (res.data?.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    setIsUpdatingRole(id);
    try {
      const res = await platformApi.updateStaffRole(id, newRole);
      if (res.data?.success) {
        setStaffList(staffList.map(s => s.id === id ? { ...s, platform_role: newRole } : s));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleFireStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke ${name}'s platform access? They will be locked out immediately.`)) return;
    
    setIsFiring(id);
    try {
      const res = await platformApi.fireStaff(id);
      if (res.data?.success) {
        setStaffList(staffList.filter(s => s.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fire staff');
    } finally {
      setIsFiring(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const totalBusinesses = stats.industryDistribution?.reduce((sum, i) => sum + i.count, 0) || 0;
  const isSuperadmin = user?.platformRole === 'SUPERADMIN';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex">
      
      <AdminSidebar user={user} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
              </button>
              <span className="text-xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
            </div>
            <div className="flex-1 md:flex-none">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">
                {location.pathname === '/admin' ? 'Admin Dashboard' : location.pathname.split('/').pop()}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 border border-primary-200 dark:border-primary-800">
                <Activity className="w-3.5 h-3.5" />
                <span>{user?.platformRole || 'Platform Admin'}</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition relative"><Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" /></button>
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-gold-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="flex-1">{error}</span>
            </div>
          )}

          <div className="flex justify-between items-center bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-xl p-4 sm:p-6 text-white">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 hidden sm:block"><Activity className="w-8 h-8" /></div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Welcome to Admin Dashboard</h2>
                <p className="text-primary-100 text-sm hidden sm:block">Track platform growth and manage your internal staff.</p>
              </div>
            </div>
            
            {isSuperadmin && (
              <div className="flex items-center gap-2">
                <button onClick={handleOpenManage} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg font-medium transition text-sm whitespace-nowrap">
                  <Users className="w-4 h-4" /> Manage Staff
                </button>
                <button onClick={() => { setHireError(''); setInviteLink(''); setShowHireModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 hover:bg-gray-100 rounded-lg font-medium transition text-sm whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Hire Staff
                </button>
              </div>
            )}
          </div>

          <AdminStatsGrid stats={stats} totalBusinesses={totalBusinesses} platformRole={user?.platformRole} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Industry Distribution</h2>
              <div className="space-y-3">
                {stats.industryDistribution.length > 0 ? (
                  stats.industryDistribution.map((industry, index) => {
                    const percentage = totalBusinesses > 0 ? (industry.count / totalBusinesses) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate">{industry.name}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${industry.color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{industry.count}</span>
                      </div>
                    );
                  })
                ) : (<p className="text-sm text-gray-500 dark:text-gray-400">No businesses yet</p>)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Registrations</h2>
              {stats.recentRegistrations.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{reg.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reg.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{reg.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-gray-500 dark:text-gray-400">No recent registrations</p>)}
            </div>
          </div>
        </main>
      </div>

      {/* Hire Staff Modal */}
      {showHireModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hire Platform Staff</h3>
              <button onClick={() => setShowHireModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleHireStaff} className="p-4 space-y-4">
              {hireError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{hireError}</div>
              )}

              {inviteLink ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 text-green-800 text-sm rounded-lg border border-green-200">
                    User is new. Send them this invite link to complete registration:
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={inviteLink} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700" />
                    <button type="button" onClick={copyToClipboard} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition">
                      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setShowHireModal(false)} className="w-full py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition">Done</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input type="email" required value={hireEmail} onChange={(e) => setHireEmail(e.target.value)} placeholder="staff@aicfo.com" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department / Role</label>
                    <select value={hireRole} onChange={(e) => setHireRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                      {ROLE_OPTIONS.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={isHiring} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition flex justify-center">
                    {isHiring ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Hire Staff'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Manage Staff Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Platform Staff</h3>
              <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {isLoadingStaff ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
              ) : staffList.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No staff members found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(staff => (
                      <tr key={staff.id} className="border-b border-gray-100 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{staff.full_name}</p>
                          <p className="text-xs text-gray-500">{staff.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          {/* ★ FIXED: Added dark mode classes */}
                          <select
                            value={staff.platform_role}
                            onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                            disabled={isUpdatingRole === staff.id || staff.id === user.id}
                            className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          {isUpdatingRole === staff.id && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-primary-600" />}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button 
                            onClick={() => handleFireStaff(staff.id, staff.full_name)}
                            disabled={isFiring === staff.id || staff.id === user.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition disabled:opacity-30"
                            title={staff.id === user.id ? "You cannot fire yourself" : "Fire Staff"}
                          >
                            {isFiring === staff.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
              <button onClick={() => setShowManageModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;