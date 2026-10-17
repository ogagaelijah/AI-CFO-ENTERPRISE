// frontend/src/pages/settings/SecurityTab.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { ShieldCheck, ShieldAlert, Copy, Check, Loader2 } from 'lucide-react';

const SecurityTab = () => {
  const { user, setUser } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.twoFactorEnabled || false);
  
  // Setup states
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);

  // ★ NEW: Disable states
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authApi.setup2FA();
      setQrCode(res.data.data.qrCodeUrl);
      setSecret(res.data.data.secret);
      setShowSetup(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await authApi.enable2FA(verifyCode);
      setIs2FAEnabled(true);
      setShowSetup(false);
      setSuccess('Two-factor authentication is now active.');
      if (setUser) setUser(prev => ({ ...prev, twoFactorEnabled: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ★ NEW: Handle Disable
  const handleDisable2FA = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await authApi.disable2FA(disableCode);
      setIs2FAEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setSuccess('Two-factor authentication has been disabled.');
      if (setUser) setUser(prev => ({ ...prev, twoFactorEnabled: false }));
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>}

      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {is2FAEnabled ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-gray-400" />}
              Two-Factor Authentication (2FA)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
              Add an extra layer of security to your account. When enabled, you'll need to enter a 6-digit code from the Google Authenticator app when you log in.
            </p>
          </div>
          
          {!is2FAEnabled && !showSetup && (
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
            </button>
          )}

          {is2FAEnabled && !showDisable && (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">
                Enabled
              </span>
              <button
                onClick={() => setShowDisable(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition"
              >
                Disable
              </button>
            </div>
          )}
        </div>

        {/* Setup Flow */}
        {showSetup && (
          <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">1. Scan this QR Code</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Open Google Authenticator (or Authy) on your phone, tap the "+" button, and scan the image below.
            </p>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {qrCode ? <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" /> : <div className="w-40 h-40 bg-gray-100 animate-pulse" />}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Can't scan? Enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded font-mono text-gray-800 dark:text-gray-200">
                      {secret}
                    </code>
                    <button onClick={copyToClipboard} className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-gold-400 transition" title="Copy to clipboard">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">2. Enter the 6-digit code</h4>
                  <form onSubmit={handleVerifyAndEnable} className="flex gap-2">
                    <input
                      type="text" maxLength="6" placeholder="000000" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      className="w-32 px-3 py-2 text-center text-lg tracking-widest border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white" required
                    />
                    <button type="submit" disabled={loading || verifyCode.length !== 6} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <button onClick={() => setShowSetup(false)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel setup</button>
          </div>
        )}

        {/* ★ NEW: Disable Flow */}
        {showDisable && (
          <div className="mt-6 border-t border-red-200 dark:border-red-900/50 pt-6">
            <h4 className="text-md font-medium text-red-600 dark:text-red-400 mb-2">Disable Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              To disable 2FA, please enter the current 6-digit code from your Google Authenticator app to confirm your identity.
            </p>
            <form onSubmit={handleDisable2FA} className="flex gap-2">
              <input
                type="text" maxLength="6" placeholder="000000" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="w-32 px-3 py-2 text-center text-lg tracking-widest border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-slate-700 dark:text-white" required
              />
              <button type="submit" disabled={loading || disableCode.length !== 6} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
              </button>
              <button type="button" onClick={() => setShowDisable(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTab;