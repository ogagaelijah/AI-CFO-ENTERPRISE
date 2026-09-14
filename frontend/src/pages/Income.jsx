// frontend/src/pages/Income.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
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
    sources_used: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    source: 'OTHER',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

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
          sources_used: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching income:', error);
      setError('Failed to load income');
    } finally {
      setIsLoading(false);
    }
  };

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

    setShowModal(false);
    setConfirmData({ ...formData });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setError('');
    setSuccess('');

    if (!confirmData) {
      setError('No data to confirm');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/income', {
        source: confirmData.source.trim(),
        amount: parseFloat(confirmData.amount),
        description: confirmData.description?.trim() || '',
        date: confirmData.date,
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setConfirmData(null);
        setFormData({
          source: 'OTHER',
          amount: 0,
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        setSuccess('✅ Income recorded successfully!');
        await fetchIncome();
      } else {
        setError(response.data?.message || 'Failed to record income');
      }
    } catch (error) {
      console.error('Error recording income:', error);
      const errorMsg = error.response?.data?.message || 'Failed to record income';
      setError(errorMsg);
      setShowConfirmModal(false);
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (updatedData) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/income/${selectedIncome.id}`, {
        source: updatedData.source.trim(),
        amount: parseFloat(updatedData.amount),
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
    if (isSubmitting) return;
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
      <PageHeader
        title="Income"
        subtitle="All non-sale revenue sources"
        actions={
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

      <IncomeTable
        incomes={incomes}
        onView={fetchIncomeDetail}
        onEdit={(income) => {
          setSelectedIncome(income);
          setShowEditModal(true);
        }}
        onDelete={handleDelete}
      />

      <RecordIncomeModal
        isOpen={showModal}
        form={formData}
        setForm={setFormData}
        onSubmit={handleSubmit}
        onClose={() => setShowModal(false)}
        error={error}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        submitting={isSubmitting}
      />

      <IncomeDetailModal
        isOpen={showDetailModal}
        income={selectedIncome}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedIncome(null);
        }}
      />

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