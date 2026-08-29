// frontend/src/pages/Debtors.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Plus, RefreshCw, Users, DollarSign, TrendingDown, AlertTriangle,
  Eye, CreditCard, Trash2, X, CheckCircle, AlertCircle
} from 'lucide-react';

// Import components
import AddDebtorModal from '../components/debtors/AddDebtorModal';
import RecordPaymentModal from '../components/debtors/RecordPaymentModal';
import DebtorDetailModal from '../components/debtors/DebtorDetailModal';
import DeleteDebtorModal from '../components/debtors/DeleteDebtorModal';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);

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

  // Delete debtor
  const handleDeleteDebtor = async () => {
    if (!selectedDebtor) return;

    try {
      const response = await api.delete(`/debtors/${selectedDebtor.id}`);
      if (response.data?.success) {
        setSuccess('✅ Debtor deleted successfully!');
        setDeleteModalOpen(false);
        setSelectedDebtor(null);
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
    if (debtor.status === 'OVERDUE' || (debtor.due_date && new Date(debtor.due_date) < new Date())) {
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

  // Filter debtors by search term
  const filteredDebtors = debtors.filter(debtor =>
    debtor.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    debtor.customer_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          onClick={() => setAddModalOpen(true)}
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
            placeholder="Search debtors by name or type..."
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
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No debtors match your search.' : 'No debtors found. Add your first debtor!'}
                  </td>
                </tr>
              ) : (
                filteredDebtors.map((debtor) => {
                  const status = getStatusBadge(debtor);
                  const daysOverdue = debtor.due_date && debtor.balance_remaining > 0 
                    ? Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24)) 
                    : 0;
                  const isPaid = debtor.balance_remaining <= 0 || debtor.status === 'PAID';
                  
                  return (
                    <tr key={debtor.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{debtor.customer_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {debtor.customer_type || 'CUSTOMER'}
                            {debtor.phone && ` • ${debtor.phone}`}
                          </p>
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
                        {debtor.due_date ? formatDate(debtor.due_date) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedDebtor(debtor);
                            setDetailModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isPaid && (
                          <button
                            onClick={() => {
                              setSelectedDebtor(debtor);
                              setPaymentModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        {isPaid && (
                          <button
                            onClick={() => {
                              setSelectedDebtor(debtor);
                              setDeleteModalOpen(true);
                            }}
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

      {/* Modals */}
      <AddDebtorModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          fetchDebtors();
          setAddModalOpen(false);
        }}
      />

      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedDebtor(null);
        }}
        onSuccess={() => {
          fetchDebtors();
          setPaymentModalOpen(false);
          setSelectedDebtor(null);
        }}
        debtor={selectedDebtor}
      />

      <DebtorDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDebtor(null);
        }}
        debtor={selectedDebtor}
        onPaymentClick={() => {
          setDetailModalOpen(false);
          setPaymentModalOpen(true);
        }}
        onDeleteClick={() => {
          setDetailModalOpen(false);
          setDeleteModalOpen(true);
        }}
      />

      <DeleteDebtorModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedDebtor(null);
        }}
        onConfirm={handleDeleteDebtor}
        debtor={selectedDebtor}
      />
    </div>
  );
};

export default Debtors;