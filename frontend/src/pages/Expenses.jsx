// frontend/src/pages/Expenses.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Expenses/SummaryCards';
import ExpenseTable from '../components/Expenses/ExpenseTable';
import RecordExpenseModal from '../components/Expenses/RecordExpenseModal';
import ConfirmModal from '../components/Expenses/ConfirmModal';
import ExpenseDetailModal from '../components/Expenses/ExpenseDetailModal';
import EditExpenseModal from '../components/Expenses/EditExpenseModal';

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
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
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    category: 'OTHER',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Fetch expenses
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/expenses');
      if (response.data?.success) {
        setExpenses(response.data.data.expenses || []);
        setSummary(response.data.data.summary || {
          total_entries: 0,
          total_amount: 0,
          average_amount: 0,
          categories_used: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single expense detail
  const fetchExpenseDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/expenses/${id}`);
      if (response.data?.success) {
        setSelectedExpense(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching expense detail:', error);
      setError('Failed to load expense details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Step 1: Validate and show confirmation
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.category.trim()) {
      setError('Category is required');
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

  // Step 2: Confirm and save
  const handleConfirm = async () => {
    setError('');
    setSuccess('');

    if (!confirmData) {
      setError('No data to confirm');
      return;
    }

    try {
      const response = await api.post('/expenses', {
        category: confirmData.category.trim(),
        amount: parseFloat(confirmData.amount),
        description: confirmData.description?.trim() || '',
        date: confirmData.date,
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setConfirmData(null);
        setFormData({
          category: 'OTHER',
          amount: 0,
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        setSuccess('✅ Expense recorded successfully!');
        await fetchExpenses();
      } else {
        setError(response.data?.message || 'Failed to record expense');
      }
    } catch (error) {
      console.error('Error recording expense:', error);
      const errorMsg = error.response?.data?.message || 'Failed to record expense';
      setError(errorMsg);
      setShowConfirmModal(false);
      setShowModal(true);
    }
  };

  // Edit expense
  const handleEditSubmit = async (updatedData) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/expenses/${selectedExpense.id}`, {
        category: updatedData.category.trim(),
        amount: parseFloat(updatedData.amount),
        description: updatedData.description?.trim() || '',
        date: updatedData.date,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedExpense(null);
        setSuccess('✅ Expense updated successfully!');
        await fetchExpenses();
      } else {
        setError(response.data?.message || 'Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      setError(error.response?.data?.message || 'Failed to update expense');
    }
  };

  // Delete expense
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const response = await api.delete(`/expenses/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Expense deleted successfully!');
        await fetchExpenses();
      } else {
        setError(response.data?.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(error.response?.data?.message || 'Failed to delete expense');
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
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
          <span>Record Expense</span>
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

      {/* Expense Table */}
      <ExpenseTable
        expenses={expenses}
        onView={fetchExpenseDetail}
        onEdit={(expense) => {
          setSelectedExpense(expense);
          setShowEditModal(true);
        }}
        onDelete={handleDelete}
      />

      {/* Record Expense Modal */}
      <RecordExpenseModal
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

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={showDetailModal}
        expense={selectedExpense}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedExpense(null);
        }}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={showEditModal}
        expense={selectedExpense}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setShowEditModal(false);
          setSelectedExpense(null);
        }}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default Expenses;