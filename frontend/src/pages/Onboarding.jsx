// frontend/src/pages/Onboarding.jsx
// v1.4.0-prod — Uses loginWithToken to ensure state is set correctly.

import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Building2, ChevronRight, Phone, AlertCircle } from 'lucide-react';

const READY_INDUSTRIES = [
  'Retail / Wholesale',
  'Construction',
  'Consultancy / Services',
  'Education',
  'NGO / Non-Profit',
];

const COMING_SOON_INDUSTRIES = [
  'Manufacturing',
  'Healthcare',
  'Real Estate',
  'Logistics',
];

const Onboarding = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth(); // ★ FIXED

  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const googleData = state || {};

  if (!googleData.email || !googleData.googleId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invalid onboarding session.</p>
          <Link to="/register" className="text-primary-600 font-medium">Go back to register</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.industry) {
      setError('Business name and industry are required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const ref = localStorage.getItem('referral_code');
      
      const res = await authApi.googleComplete({
        email: googleData.email,
        fullName: googleData.fullName,
        googleId: googleData.googleId,
        businessName: formData.businessName.trim(),
        industry: formData.industry,
        phone: formData.phone.trim(),
        ref: ref,
      });

      if (res.data?.token) {
        await loginWithToken(res.data.token); // ★ FIXED
        localStorage.removeItem('referral_code');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-gold-400">AI CFO</span>
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">ENTERPRISE</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 mb-4">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-gold-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Almost there!</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome {googleData.fullName}. Tell us about your business.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Your business name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="080 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                >
                  <option value="">Select your industry</option>
                  {READY_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                  {COMING_SOON_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} disabled>{ind} — Coming soon</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition shadow-md disabled:opacity-70 flex items-center justify-center mt-6"
              >
                {isLoading ? 'Setting up...' : (
                  <>Complete Setup <ChevronRight className="w-5 h-5 ml-2" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;