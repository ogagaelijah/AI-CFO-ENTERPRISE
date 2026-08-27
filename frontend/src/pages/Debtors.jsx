// frontend/src/pages/Debtors.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Plus, Eye, Edit, Trash2, X, CheckCircle, AlertCircle, 
  Users, AlertTriangle, TrendingUp, TrendingDown, 
  DollarSign, Clock, Search, RefreshCw, CreditCard,
  Calendar, FileText, User
} from 'lucide-react';

const Debtors = () => {
  const { user } = useAuth();
  const [debtors, setDebtors] = useState([]);
  const [summary, setSummary] = useState({
    total_debtors: 0,
    total_owed: 0,
    total_paid: 0,
    total_outstanding: 0,
    active_count: 0,
    paid_count: 0,
    overdue_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Form
  const [addForm, setAddForm] = useState({
    customerName: '',
    totalOwed: 0,
    dueDate: '',
    notes: '',
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: '',
  });

  // Fetch debtors
  useEffect(() => {
    fetchDebtors();
  }, []);

  const fetchDebtors = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔍 Fetching debtors...');
      
      const response = await api.get('/debtors');
      
      console.log('✅ Debtors response:', response.data);
      
      if (response.data?.success) {
        setDebtors(response.data.data.debtors || []);
        setSummary(response.data.data.summary || {
          total_debtors: 0,
          total_owed: 0,
          total_paid: 0,
          total_outstanding: 0,
          active_count: 0,
          paid_count: 0,
          overdue_count: 0,
        });
      } else {
        setDebtors([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching debtors:', error);
      setError('Failed to load debtors');
      setDebtors([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add debtor
  const handleAddDebtor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addForm.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (!addForm.totalOwed || addForm.totalOwed <= 0) {
      setError('Amount owed must be greater than 0');
      return;
    }

    try {
      const response = await api.post('/debtors', {
        customerName: addForm.customerName.trim(),
        totalOwed: parseFloat(addForm.totalOwed),
        dueDate: addForm.dueDate || null,
        notes: addForm.notes.trim() || '',
      });

      if (response.data?.success) {
        setSuccess('✅ Debtor added successfully!');
        setShowAddModal(false);
        setAddForm({ customerName: '', totalOwed: 0, dueDate: '', notes: '' });
        fetchDebtors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add debtor');
    }
  };

  // Record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentForm.amount || paymentForm.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (paymentForm.amount > selectedDebtor.balance_remaining) {
      setError(`Payment amount exceeds balance of ₦${selectedDebtor.balance_remaining.toLocaleString()}`);
      return;
    }

    try {
      const response = await api.post(`/debtors/${selectedDebtor.id}/payment`, {
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes.trim() || '',
      });

      if (response.data?.success) {
        setSuccess(`✅ Payment of ₦${parseFloat(paymentForm.amount).toLocaleString()} recorded successfully!`);
        setShowPaymentModal(false);
        setSelectedDebtor(null);
        setPaymentForm({ amount: 0, notes: '' });
        fetchDebtors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  // Delete debtor
  const handleDeleteDebtor = async (id) => {
    if (!confirm('Are you sure you want to delete this debtor?')) return;

    try {
      const response = await api.delete(`/debtors/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Debtor deleted successfully!');
        fetchDebtors();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete debtor');
    }
  };

  // Get status badge
  const getStatusBadge = (debtor) => {
    if (debtor.balance_remaining <= 0 || debtor.status === 'PAID') {
      return { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' };
    }
    if (debtor.status === 'OVERDUE' || debtor.due_date && new Date(debtor.due_date) < new Date()) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🔴' };
    }
    return { label: 'Active', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🟡' };
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading debtors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debtors</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Debtor</span>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-xs">Active Debtors</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summary.active_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Total Owed</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">₦{(summary.total_owed || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs">Outstanding</span>
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">₦{(summary.total_outstanding || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">Overdue</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${summary.overdue_count > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
            {summary.overdue_count || 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search debtors..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              setSearchTerm('');
              fetchDebtors();
            }}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {debtors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No debtors found. Add your first debtor!
                  </td>
                </tr>
              ) : (
                debtors.map((debtor) => {
                  const status = getStatusBadge(debtor);
                  const daysOverdue = debtor.due_date && debtor.balance_remaining > 0 
                    ? Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24)) 
                    : 0;
                  
                  return (
                    <tr key={debtor.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{debtor.customer_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {debtor.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                        ₦{(debtor.total_owed || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                        ₦{(debtor.amount_paid || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${debtor.balance_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          ₦{(debtor.balance_remaining || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                          {status.label === 'Overdue' && ` (${daysOverdue}d)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {debtor.due_date ? new Date(debtor.due_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedDebtor(debtor);
                            setShowDetailModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {debtor.balance_remaining > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDebtor(debtor);
                              setShowPaymentModal(true);
                              setPaymentForm({ amount: 0, notes: '' });
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        {debtor.balance_remaining <= 0 && (
                          <button
                            onClick={() => handleDeleteDebtor(debtor.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Detail Modal - NOW WORKING */}
      {showDetailModal && selectedDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Debtor Details
              </h2>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedDebtor(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer Name</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {selectedDebtor.customer_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedDebtor.customer_type || 'CUSTOMER'}
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Owed</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    ₦{(selectedDebtor.total_owed || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    ₦{(selectedDebtor.amount_paid || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${selectedDebtor.balance_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ₦{(selectedDebtor.balance_remaining || 0).toLocaleString()
                  }</p>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block mt-1 ${getStatusBadge(selectedDebtor).color}`}>
                    {getStatusBadge(selectedDebtor).icon} {getStatusBadge(selectedDebtor).label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(selectedDebtor.due_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedDebtor.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Payment</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedDebtor.last_payment_date)}
                  </p>
                </div>
              </div>

              {/* Reference Info */}
              {selectedDebtor.reference_type && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedDebtor.reference_type}: #{selectedDebtor.reference_id || 'N/A'}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedDebtor.notes && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDebtor.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                {selectedDebtor.balance_remaining > 0 && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowPaymentModal(true);
                      setPaymentForm({ amount: 0, notes: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Record Payment
                  </button>
                )}
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedDebtor(null); }}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Debtor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Debtor</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddDebtor} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Owed (₦) *
                </label>
                <input
                  type="number"
                  value={addForm.totalOwed}
                  onChange={(e) => setAddForm({ ...addForm, totalOwed: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={addForm.dueDate}
                  onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="2"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  Add Debtor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedDebtor(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Customer:</span> {selectedDebtor.customer_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Outstanding Balance:</span> 
                  <span className="font-bold text-red-600 dark:text-red-400 ml-1">₦{selectedDebtor.balance_remaining.toLocaleString()}</span>
                </p>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Amount (₦) *
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    max={selectedDebtor.balance_remaining}
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Max: ₦{selectedDebtor.balance_remaining.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Payment notes..."
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setShowPaymentModal(false); setSelectedDebtor(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debtors;