// frontend/src/pages/Income.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react'; // ✅ Added CheckCircle and AlertCircle
import SummaryCards from '../components/Income/SummaryCards';
import IncomeTable from '../components/Income/IncomeTable';
import RecordIncomeModal from '../components/Income/RecordIncomeModal';
import ConfirmModal from '../components/Income/ConfirmModal';
import IncomeDetailModal from '../components/Income/IncomeDetailModal';
import EditIncomeModal from '../components/Income/EditIncomeModal';

const Income = () => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [summary, setSummary] = useState({
    total_entries: 0,
    total_amount: 0,
    average_amount: 0,
    categories_used: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    source: '',
    amount: 0,
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Fetch income
  useEffect(() => {
    fetchIncome();
  }, []);

  const fetchIncome = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/income');
      if (response.data?.success) {
        setIncomes(response.data.data.incomes || []);
        setSummary(response.data.data.summary || {
          total_entries: 0,
          total_amount: 0,
          average_amount: 0,
          categories_used: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching income:', error);
      setError('Failed to load income');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single income detail
  const fetchIncomeDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/income/${id}`);
      if (response.data?.success) {
        setSelectedIncome(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching income detail:', error);
      setError('Failed to load income details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Step 1: Validate and show confirmation
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.source.trim()) {
      setError('Source is required');
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Close record modal and open confirmation
    setShowModal(false);
    setConfirmData({ ...formData });
    setShowConfirmModal(true);
  };

  // Step 2: Confirm and save
  const handleConfirm = async () => {
    setError('');
    setSuccess('');

    // Safety check
    if (!confirmData) {
      setError('No data to confirm');
      return;
    }

    try {
      const response = await api.post('/income', {
        source: confirmData.source.trim(),
        amount: parseFloat(confirmData.amount),
        category: confirmData.category || 'Other',
        description: confirmData.description?.trim() || '',
        date: confirmData.date,
      });

      if (response.data?.success) {
        // Close confirmation modal
        setShowConfirmModal(false);
        setConfirmData(null);
        
        // Reset form
        setFormData({
          source: '',
          amount: 0,
          category: 'Other',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        
        // Show success
        setSuccess('✅ Income recorded successfully!');
        
        // Refresh the list
        await fetchIncome();
      } else {
        setError(response.data?.message || 'Failed to record income');
      }
    } catch (error) {
      console.error('Error recording income:', error);
      const errorMsg = error.response?.data?.message || 'Failed to record income';
      setError(errorMsg);
      // Go back to record modal on error
      setShowConfirmModal(false);
      setShowModal(true);
    }
  };

  // Edit income
  const handleEditSubmit = async (updatedData) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/income/${selectedIncome.id}`, {
        source: updatedData.source.trim(),
        amount: parseFloat(updatedData.amount),
        category: updatedData.category || 'Other',
        description: updatedData.description?.trim() || '',
        date: updatedData.date,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedIncome(null);
        setSuccess('✅ Income updated successfully!');
        await fetchIncome();
      } else {
        setError(response.data?.message || 'Failed to update income');
      }
    } catch (error) {
      console.error('Error updating income:', error);
      setError(error.response?.data?.message || 'Failed to update income');
    }
  };

  // Delete income
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    try {
      const response = await api.delete(`/income/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Income deleted successfully!');
        await fetchIncome();
      } else {
        setError(response.data?.message || 'Failed to delete income');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      setError(error.response?.data?.message || 'Failed to delete income');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading income...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
            setConfirmData(null);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Record Income</span>
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

      {/* Income Table */}
      <IncomeTable
        incomes={incomes}
        onView={fetchIncomeDetail}
        onEdit={(income) => {
          setSelectedIncome(income);
          setShowEditModal(true);
        }}
        onDelete={handleDelete}
      />

      {/* Record Income Modal */}
      <RecordIncomeModal
        isOpen={showModal}
        form={formData}
        setForm={setFormData}
        onSubmit={handleSubmit}
        onClose={() => setShowModal(false)}
        error={error}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />

      {/* Income Detail Modal */}
      <IncomeDetailModal
        isOpen={showDetailModal}
        income={selectedIncome}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedIncome(null);
        }}
      />

      {/* Edit Income Modal */}
      <EditIncomeModal
        isOpen={showEditModal}
        income={selectedIncome}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setShowEditModal(false);
          setSelectedIncome(null);
        }}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default Income;