// frontend/src/pages/PaymentSuccess.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { paymentApi } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference');
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setLoading(false);
        setSuccess(false);
        setErrorMessage('No payment reference found. Please contact support.');
        return;
      }

      console.log('🔍 Verifying payment reference:', reference);

      try {
        const response = await paymentApi.verify(reference);
        console.log('🔍 Verification response:', response.data);

        if (response.data.success) {
          setSuccess(true);
          setPlan(response.data.data?.plan || 'Pro');
          
          // ✅ Refresh user data from backend
          console.log('🔄 Refreshing user data...');
          try {
            const userResponse = await authApi.getCurrentUser();
            if (userResponse.data?.user) {
              setUser(userResponse.data.user);
              console.log('✅ User data refreshed:', userResponse.data.user);
            }
          } catch (refreshError) {
            console.error('Failed to refresh user data:', refreshError);
          }
          
          // ✅ Wait 1 second then redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          
        } else {
          setSuccess(false);
          setErrorMessage(response.data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setSuccess(false);
        setErrorMessage(error.response?.data?.message || 'Payment verification failed. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        {success ? (
          <>
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful! 🎉</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your <span className="font-semibold text-primary-600 dark:text-gold-400">{plan}</span> plan has been activated.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Redirecting you to the dashboard...
            </p>
            {reference && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Reference: {reference}</p>
            )}
            <div className="mt-6 space-y-3">
              <Link
                to="/dashboard"
                className="block w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
                onClick={() => {
                  // Force refresh user data on click
                  authApi.getCurrentUser().then(res => {
                    if (res.data?.user) setUser(res.data.user);
                  });
                }}
              >
                Go to Dashboard
              </Link>
              <Link
                to="/subscription"
                className="block w-full px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
              >
                View Subscription
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Verification Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {errorMessage || 'There was an issue verifying your payment.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              If you received a payment confirmation email, your plan will be activated shortly.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/subscription"
                className="block w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
              >
                Try Again
              </Link>
              <Link
                to="/dashboard"
                className="block w-full px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;