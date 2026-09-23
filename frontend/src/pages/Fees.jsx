// frontend/src/pages/Fees.jsx
// v1.1.0 — Adds "Generate Class Fees" bulk action.

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle, Users } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Fees/SummaryCards';
import FeeTable from '../components/Fees/FeeTable';
import RecordFeeModal from '../components/Fees/RecordFeeModal';
import EditFeeModal from '../components/Fees/EditFeeModal';
import FeeDetailModal from '../components/Fees/FeeDetailModal';
import RecordFeePaymentModal from '../components/Fees/RecordFeePaymentModal';
import GenerateClassFeesModal from '../components/Fees/GenerateClassFeesModal';
import ConfirmModal from '../components/Fees/ConfirmModal';

const Fees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFees();
  }, [statusFilter]);

  const fetchFees = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/fees', { params });

      if (response.data?.success) {
        setFees(response.data.fees || []);
        setSummary(response.data.summary || {
          totalCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueCount: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      setError(error.response?.data?.message || 'Failed to load fees');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeeDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/fees/${id}`);
      if (response.data?.success) {
        setSelectedFee(response.data.fee);
        setShowDetailModal(true);
      } else {
        setError('Failed to load fee details');
      }
    } catch (error) {
      console.error('❌ Error fetching fee detail:', error);
      setError(error.response?.data?.message || 'Failed to load fee details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/fees', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Fee ${response.data.fee?.feeNumber || ''} created`);
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to create fee');
      }
    } catch (error) {
      console.error('Error creating fee:', error);
      setError(error.response?.data?.message || 'Failed to create fee');
    }
  };

  const handleBulkGenerate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/fees/bulk', data);
      if (response.data?.success) {
        setShowBulkModal(false);
        const { created = 0, skipped = 0 } = response.data;
        setSuccess(
          `✅ Generated ${created} fee(s)` +
          (skipped ? `, skipped ${skipped} (already existed)` : '')
        );
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to generate fees');
      }
    } catch (error) {
      console.error('Error generating class fees:', error);
      setError(error.response?.data?.message || 'Failed to generate fees');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/fees/${selectedFee.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedFee(null);
        setSuccess('✅ Fee updated successfully!');
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to update fee');
      }
    } catch (error) {
      console.error('Error updating fee:', error);
      setError(error.response?.data?.message || 'Failed to update fee');
    }
  };

  const handleDelete = async () => {
    if (!selectedFee) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/fees/${selectedFee.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedFee(null);
        setSuccess(response.data.message || '✅ Fee deleted');
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to delete fee');
      }
    } catch (error) {
      console.error('Error deleting fee:', error);
      setError(error.response?.data?.message || 'Failed to delete fee');
      setShowConfirmModal(false);
    }
  };

  const handleMarkAsSent = async (fee) => {
    if (!fee) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/fees/${fee.id}`, { status: 'SENT' });
      if (response.data?.success) {
        setShowDetailModal(false);
        setSelectedFee(null);
        setSuccess(`✅ Fee ${fee.feeNumber || ''} marked as sent. Student balance updated.`);
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to mark fee as sent');
      }
    } catch (error) {
      console.error('Error marking fee as sent:', error);
      setError(error.response?.data?.message || 'Failed to mark fee as sent');
    }
  };

  const handleRecordPaymentSubmit = async (data) => {
    if (!selectedFee) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/fees/${selectedFee.id}/payments`, {
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });
      if (response.data?.success) {
        setShowPaymentModal(false);
        setShowDetailModal(false);
        setSelectedFee(null);
        setSuccess(
          response.data?.message ||
          `✅ Payment of ₦${Number(data.amount).toLocaleString()} recorded.`
        );
        await fetchFees();
      } else {
        setError(response.data?.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording fee payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleOpenPaymentFromDetail = (fee) => {
    setSelectedFee(fee);
    setShowDetailModal(false);
    setShowPaymentModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        subtitle="Student fees and billing"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowBulkModal(true);
                setError('');
                setSuccess('');
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-primary-600 text-primary-600 dark:text-gold-400 dark:border-gold-400 hover:bg-primary-50 dark:hover:bg-gold-900/20 rounded-lg transition"
            >
              <Users className="w-5 h-5" />
              <span>Generate Class Fees</span>
            </button>
            <button
              onClick={() => {
                setShowModal(true);
                setError('');
                setSuccess('');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create Fee</span>
            </button>
          </div>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchFees()}
          placeholder="Search by fee number, student, or description..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <FeeTable
        fees={fees}
        onView={fetchFeeDetail}
        onEdit={(fee) => {
          setSelectedFee(fee);
          setShowEditModal(true);
        }}
        onDelete={(fee) => {
          setSelectedFee(fee);
          setShowConfirmModal(true);
        }}
      />

      <RecordFeeModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <GenerateClassFeesModal
        isOpen={showBulkModal}
        onSubmit={handleBulkGenerate}
        onClose={() => setShowBulkModal(false)}
        error={error}
        setError={setError}
      />

      <EditFeeModal
        isOpen={showEditModal}
        fee={selectedFee}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedFee(null);
        }}
        error={error}
        setError={setError}
      />

      <FeeDetailModal
        isOpen={showDetailModal}
        fee={selectedFee}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedFee(null);
        }}
        onRecordPayment={handleOpenPaymentFromDetail}
        onMarkAsSent={handleMarkAsSent}
      />

      <RecordFeePaymentModal
        isOpen={showPaymentModal}
        fee={selectedFee}
        onSubmit={handleRecordPaymentSubmit}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedFee(null);
        }}
        error={error}
        setError={setError}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        fee={selectedFee}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedFee(null);
        }}
      />
    </div>
  );
};

export default Fees;