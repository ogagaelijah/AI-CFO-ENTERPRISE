// frontend/src/pages/Payments.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Payments/SummaryCards';
import PaymentTable from '../components/Payments/PaymentTable';
import RecordPaymentModal from '../components/Payments/RecordPaymentModal';
import PaymentDetailModal from '../components/Payments/PaymentDetailModal';
import ConfirmModal from '../components/Payments/ConfirmModal';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    total_payments: 0,
    total_in: 0,
    total_out: 0,
    count_in: 0,
    count_out: 0,
    net_flow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/payments', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 100,
        },
      });
      
      if (response.data?.success) {
        setPayments(response.data.payments || []);
        setSummary(response.data.summary || {
          total_payments: 0,
          total_in: 0,
          total_out: 0,
          count_in: 0,
          count_out: 0,
          net_flow: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/payments/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      if (response.data?.success) {
        setSelectedPayment(response.data.payment);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching payment detail:', error);
      setError('Failed to load payment details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/payments', {
        ...data,
        businessId: user?.businessId || user?.id,
        userId: user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Payment recorded successfully!');
        await fetchPayments();
      } else {
        setError(response.data?.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;

    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/payments/${selectedPayment.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedPayment(null);
        setSuccess('✅ Payment deleted successfully!');
        await fetchPayments();
      } else {
        setError(response.data?.message || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      setError(error.response?.data?.message || 'Failed to delete payment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="All money movements in and out"
        actions={
          <button
            onClick={() => {
              setShowModal(true);
              setError('');
              setSuccess('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Record Payment</span>
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SummaryCards summary={summary} />

      <PaymentTable
        payments={payments}
        onView={fetchPaymentDetail}
        onDelete={(payment) => {
          setSelectedPayment(payment);
          setShowConfirmModal(true);
        }}
      />

      <RecordPaymentModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <PaymentDetailModal
        isOpen={showDetailModal}
        payment={selectedPayment}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPayment(null);
        }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        payment={selectedPayment}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedPayment(null);
        }}
      />
    </div>
  );
};

export default Payments;