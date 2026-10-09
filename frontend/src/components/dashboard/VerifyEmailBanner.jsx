// frontend/src/components/dashboard/VerifyEmailBanner.jsx
// v1.0.0 — Persistent banner shown on the dashboard when the user's
//           email is not yet verified. Dismissible per session;
//           shows a resend button. Auto-hides when emailVerified = true.

import { useState } from 'react';
import { MailWarning, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';

const DISMISS_KEY = 'aicfo.verifyBannerDismissed';

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const markDismissed = () => {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* storage unavailable */
  }
};

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Not logged in, already verified, or dismissed for the session — hide.
  if (!user) return null;
  if (user.emailVerified) return null;
  if (dismissed) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setResending(true);
    try {
      await authApi.resendVerification(user.email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      /* silent — same enumeration-protection stance as backend */
    } finally {
      setResending(false);
    }
  };

  const handleDismiss = () => {
    markDismissed();
    setDismissed(true);
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Please verify your email
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5 break-words">
          We sent a verification link to{' '}
          <span className="font-medium">{user.email}</span>. Check your inbox
          (or spam folder) and click the link to activate your account.
        </p>

        {resent && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Verification email sent again. Check your inbox.
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="text-sm font-medium text-amber-900 dark:text-amber-200 hover:underline disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center"
          >
            {resending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend verification email'
            )}
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-amber-700 dark:text-amber-400" />
      </button>
    </div>
  );
}