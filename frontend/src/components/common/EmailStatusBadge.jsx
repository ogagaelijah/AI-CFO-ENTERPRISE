// frontend/src/components/common/EmailStatusBadge.jsx
// v1.0.0 — Small inline badge that shows email verification status.
//           Used by ProfileTab and DashboardHeader. Includes an optional
//           resend link for unverified users.

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';

export default function EmailStatusBadge({ variant = 'default', showResend = true }) {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (!user) return null;

  const isVerified = user.emailVerified === true;

  // Verified state — calm, informative
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Verified
      </span>
    );
  }

  // Unverified state — amber, actionable
  const handleResend = async () => {
    if (!user.email) return;
    setResending(true);
    try {
      await authApi.resendVerification(user.email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      /* silent */
    } finally {
      setResending(false);
    }
  };

  // Compact variant (for header dropdown)
  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3.5 h-3.5" />
        Not verified
      </span>
    );
  }

  // Default variant (for Settings — includes resend button)
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-3.5 h-3.5" />
        Not verified
      </span>
      {showResend && (
        <>
          {resent ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              Email sent
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-medium text-primary-600 dark:text-gold-400 hover:underline disabled:opacity-60 inline-flex items-center gap-1"
            >
              {resending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend verification'
              )}
            </button>
          )}
        </>
      )}
    </span>
  );
}