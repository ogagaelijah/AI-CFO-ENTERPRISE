// frontend/src/pages/Terms.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Terms/SummaryCards';
import TermTable from '../components/Terms/TermTable';
import RecordTermModal from '../components/Terms/RecordTermModal';
import EditTermModal from '../components/Terms/EditTermModal';
import ConfirmModal from '../components/Terms/ConfirmModal';

const Terms = () => {
  const { user } = useAuth();
  const [terms, setTerms] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    completed: 0,
    activeName: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTerms();
  }, [statusFilter, sessionFilter]);

  const fetchTerms = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      if (sessionFilter) params.session = sessionFilter;

      const response = await api.get('/terms', { params });

      if (response.data?.success) {
        const list = response.data.terms || [];
        setTerms(list);

        const total = response.data.pagination?.total ?? list.length;
        const active = list.filter((t) => t.status === 'ACTIVE').length;
        const completed = list.filter((t) => t.status === 'COMPLETED').length;
        const activeTerm = list.find((t) => t.status === 'ACTIVE');

        setSummary({
          total,
          active,
          completed,
          activeName: activeTerm ? `${activeTerm.name} (${activeTerm.session})` : null,
        });
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
      setError(error.response?.data?.message || 'Failed to load terms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/terms', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Term "${response.data.term?.name || ''}" created`);
        await fetchTerms();
      } else {
        setError(response.data?.message || 'Failed to create term');
      }
    } catch (error) {
      console.error('Error creating term:', error);
      setError(error.response?.data?.message || 'Failed to create term');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/terms/${selectedTerm.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedTerm(null);
        setSuccess('✅ Term updated successfully!');
        await fetchTerms();
      } else {
        setError(response.data?.message || 'Failed to update term');
      }
    } catch (error) {
      console.error('Error updating term:', error);
      setError(error.response?.data?.message || 'Failed to update term');
    }
  };

  const handleSetActive = async (term) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/terms/${term.id}/set-active`);
      if (response.data?.success) {
        setSuccess(`✅ "${term.name}" is now the active term`);
        await fetchTerms();
      } else {
        setError(response.data?.message || 'Failed to activate term');
      }
    } catch (error) {
      console.error('Error activating term:', error);
      setError(error.response?.data?.message || 'Failed to activate term');
    }
  };

  const handleDelete = async () => {
    if (!selectedTerm) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/terms/${selectedTerm.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedTerm(null);
        setSuccess(response.data.message || '✅ Term deleted');
        await fetchTerms();
      } else {
        setError(response.data?.message || 'Failed to delete term');
      }
    } catch (error) {
      console.error('Error deleting term:', error);
      setError(error.response?.data?.message || 'Failed to delete term');
      setShowConfirmModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        subtitle="Academic terms and sessions"
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
            <span>Add Term</span>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          placeholder="Filter by session (e.g. 2025/2026)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <TermTable
        terms={terms}
        onEdit={(term) => {
          setSelectedTerm(term);
          setShowEditModal(true);
        }}
        onSetActive={handleSetActive}
        onDelete={(term) => {
          setSelectedTerm(term);
          setShowConfirmModal(true);
        }}
      />

      <RecordTermModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditTermModal
        isOpen={showEditModal}
        term={selectedTerm}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTerm(null);
        }}
        error={error}
        setError={setError}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        term={selectedTerm}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedTerm(null);
        }}
      />
    </div>
  );
};

export default Terms;