// frontend/src/pages/Creditors.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Creditors/SummaryCards';
import CreditorTable from '../components/Creditors/CreditorTable';
import AddCreditorModal from '../components/Creditors/AddCreditorModal';
import RecordPaymentModal from '../components/Creditors/RecordPaymentModal';
import ConfirmModal from '../components/Creditors/ConfirmModal';
import CreditorDetailModal from '../components/Creditors/CreditorDetailModal';

const Creditors = () => {
  const { user } = useAuth();
  const [creditors, setCreditors] = useState([]);
  const [summary, setSummary] = useState({
    total_creditors: 0,
    total_owed: 0,
    total_paid: 0,
    total_outstanding: 0,
    active_count: 0,
    paid_count: 0,
    overdue_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCreditor, setSelectedCreditor] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmType, setConfirmType] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms
  const [addForm, setAddForm] = useState({
    supplierName: '',
    totalOwed: 0,
    dueDate: '',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: '',
  });

  // Fetch creditors
  useEffect(() => {
    fetchCreditors();
  }, []);

  const fetchCreditors = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/creditors');
      if (response.data?.success) {
        setCreditors(response.data.data.creditors || []);
        setSummary(response.data.data.summary || {
          total_creditors: 0,
          total_owed: 0,
          total_paid: 0,
          total_outstanding: 0,
          active_count: 0,
          paid_count: 0,
          overdue_count: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching creditors:', error);
      setError('Failed to load creditors');
    } finally {
      setIsLoading(false);
    }
  };

  // Add creditor - Step 1: Validate
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addForm.supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }

    if (addForm.totalOwed <= 0) {
      setError('Amount owed must be greater than 0');
      return;
    }

    setShowAddModal(false);
    setConfirmData({ ...addForm });
    setConfirmType('add');
    setShowConfirmModal(true);
  };

  // Add creditor - Step 2: Confirm
  const handleConfirmAdd = async () => {
    setError('');
    setSuccess('');
    setShowConfirmModal(false);

    try {
      const response = await api.post('/creditors', {
        supplierName: confirmData.supplierName.trim(),
        totalOwed: parseFloat(confirmData.totalOwed),
        dueDate: confirmData.dueDate || null,
        notes: confirmData.notes?.trim() || '',
      });

      if (response.data?.success) {
        setSuccess('✅ Creditor added successfully!');
        setAddForm({ supplierName: '', totalOwed: 0, dueDate: '', notes: '' });
        setConfirmData(null);
        await fetchCreditors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add creditor');
      setShowAddModal(true);
    }
  };

  // Record payment - Step 1: Show payment modal
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (paymentForm.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (paymentForm.amount > selectedCreditor.balance_remaining) {
      setError(`Payment amount exceeds balance of ₦${selectedCreditor.balance_remaining.toLocaleString()}`);
      return;
    }

    setShowPaymentModal(false);
    setConfirmData({
      creditor: selectedCreditor,
      amount: paymentForm.amount,
      notes: paymentForm.notes,
    });
    setConfirmType('payment');
    setShowConfirmModal(true);
  };

  // Record payment - Step 2: Confirm
  const handleConfirmPayment = async () => {
    setError('');
    setSuccess('');
    setShowConfirmModal(false);

    try {
      const response = await api.post(`/creditors/${selectedCreditor.id}/payment`, {
        amount: parseFloat(confirmData.amount),
        notes: confirmData.notes?.trim() || '',
      });

      if (response.data?.success) {
        setSuccess(`✅ Payment of ₦${parseFloat(confirmData.amount).toLocaleString()} recorded successfully!`);
        setShowPaymentModal(false);
        setSelectedCreditor(null);
        setPaymentForm({ amount: 0, notes: '' });
        setConfirmData(null);
        await fetchCreditors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record payment');
      setShowPaymentModal(true);
    }
  };

  // View creditor details
  const fetchCreditorDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/creditors/${id}`);
      if (response.data?.success) {
        setSelectedCreditor(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching creditor detail:', error);
      setError('Failed to load creditor details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Delete creditor
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this creditor?')) return;

    try {
      const response = await api.delete(`/creditors/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Creditor deleted successfully!');
        await fetchCreditors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete creditor');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
    if (confirmType === 'add') {
      setShowAddModal(true);
    } else if (confirmType === 'payment') {
      setShowPaymentModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading creditors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Creditors</h1>
        <button
          onClick={() => {
            setShowAddModal(true);
            setError('');
            setSuccess('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Creditor</span>
        </button>
      </div>

      {/* Error/Success */}
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

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Creditor Table */}
      <CreditorTable
        creditors={creditors}
        onView={fetchCreditorDetail}
        onPay={(creditor) => {
          setSelectedCreditor(creditor);
          setPaymentForm({ amount: 0, notes: '' });
          setShowPaymentModal(true);
        }}
        onEdit={() => {}}
        onDelete={handleDelete}
      />

      {/* Add Creditor Modal */}
      <AddCreditorModal
        isOpen={showAddModal}
        form={addForm}
        setForm={setAddForm}
        onSubmit={handleAddSubmit}
        onClose={() => setShowAddModal(false)}
        error={error}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        creditor={selectedCreditor}
        form={paymentForm}
        setForm={setPaymentForm}
        onSubmit={handlePaymentSubmit}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCreditor(null);
        }}
        error={error}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        onConfirm={confirmType === 'add' ? handleConfirmAdd : handleConfirmPayment}
        onCancel={handleCancelConfirm}
        type={confirmType}
      />

      {/* Creditor Detail Modal */}
      <CreditorDetailModal
        isOpen={showDetailModal}
        creditor={selectedCreditor}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCreditor(null);
        }}
      />
    </div>
  );
};

export default Creditors;