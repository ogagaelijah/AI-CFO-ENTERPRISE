// frontend/src/components/auth/GoogleAuthButton.jsx
// v1.8.0-prod — Uses loginWithToken so isAuthenticated + plan are set before navigating.

import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi, clearStoredToken } from '../../services/api';
import { useState } from 'react';

const GoogleAuthButton = ({ onError }) => {
  const navigate = useNavigate();
  const { loginWithToken, setIsLoggingIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    if (isLoading) return;
    setIsLoading(true);
    setIsLoggingIn(true);

    try {
      const res = await authApi.googleAuth(credentialResponse.credential);

      if (res.data?.needsOnboarding) {
        navigate('/onboarding', {
          state: {
            email: res.data.email,
            fullName: res.data.fullName,
            googleId: res.data.googleId,
          },
        });
        return;
      }

      if (res.data?.token) {
        // ★ FIXED: Use the new loginWithToken which sets isAuthenticated and planData
        await loginWithToken(res.data.token);
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('🔴 Google Auth Error Details:', error);
      clearStoredToken();
      if (onError) {
        onError(
          error.response?.data?.message || error.message || 'Google login failed'
        );
      }
    } finally {
      setIsLoading(false);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="w-full flex justify-center mt-4">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          console.error('🔴 Google Popup Error');
          if (onError) onError('Google login popup failed');
        }}
        useOneTap={false}
        theme="outline"
        size="large"
        width="360"
      />
    </div>
  );
};

export default GoogleAuthButton;