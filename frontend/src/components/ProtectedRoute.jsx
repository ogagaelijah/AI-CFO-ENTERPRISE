// frontend/src/components/ProtectedRoute.jsx
// v2.3.0-prod — Ensures noindex is injected even during redirects to prevent URL indexing.
// v2.2.0-prod — Applies noindex metadata to all protected application routes.
// v2.1.0-prod — Adds allowedRoles prop.
// v2.0.0-prod — Uses platformRole for admin access.

import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  allowedRoles = null,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // 1. Handle Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // 2. The NoIndex Guard
  // We wrap the redirects in a React Fragment with the Helmet tag.
  // This ensures that even if a crawler or unauthenticated user hits the URL,
  // the noindex tag is rendered in the <head> before the redirect happens.
  const noIndexWrapper = (element) => (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {element}
    </>
  );

  // 3. Handle Unauthenticated
  if (!isAuthenticated) {
    return noIndexWrapper(<Navigate to="/" replace />);
  }

  // 4. Handle Role Restrictions
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return noIndexWrapper(<Navigate to="/dashboard" replace />);
  }

  // 5. Handle Admin Restrictions
  if (requireAdmin) {
    const allowedPlatformRoles = [
      'SUPERADMIN',
      'ADMIN',
      'SUPPORT',
      'TECHNICAL',
      'OPERATIONS',
      'MARKETING',
      'HR',
      'COMPLIANCE',
      'FINANCE',
    ];

    const isPlatformStaff =
      user?.platformRole &&
      allowedPlatformRoles.includes(user.platformRole);

    const isTenantAdmin = user?.isAdmin === true;

    if (!isPlatformStaff && !isTenantAdmin) {
      return noIndexWrapper(<Navigate to="/dashboard" replace />);
    }
  }

  // 6. Handle Authorized Render
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {children}
    </>
  );
};

export default ProtectedRoute;