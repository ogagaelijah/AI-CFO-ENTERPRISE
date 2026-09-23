// frontend/src/pages/Pledges.jsx

import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Pledges/SummaryCards';
import PledgeTable from '../components/Pledges/PledgeTable';
import RecordPledgeModal from '../components/Pledges/RecordPledgeModal';
import EditPledgeModal from '../components/Pledges/EditPledgeModal';
import PledgeDetailModal from '../components/Pledges/PledgeDetailModal';
import ConfirmModal from '../components/Pledges/ConfirmModal';

const Pledges = () => {
  const [pledges, setPledges] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0, totalPledged: 0, totalFulfilled: 0, totalOutstanding: 0,
    activeCount: 0, fulfilledCount: 0, overdueCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPledge, setSelectedPledge] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchPledges(); }, [statusFilter]);

  const fetchPledges = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/pledges', { params });
      if (response.data?.success) {
        setPledges(response.data.pledges || []);
        setSummary(response.data.summary || {
          totalCount: 0, totalPledged: 0, totalFulfilled: 0, totalOutstanding: 0,
          activeCount: 0, fulfilledCount: 0, overdueCount: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching pledges:', error);
      setError(error.response?.data?.message || 'Failed to load pledges');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPledgeDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/pledges/${id}`);
      if (response.data?.success) {
        setSelectedPledge(response.data.pledge);
        setShowDetailModal(true);
      } else {
        setError('Failed to load pledge details');
      }
    } catch (error) {
      console.error('Error fetching pledge detail:', error);
      setError(error.response?.data?.message || 'Failed to load pledge details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError(''); setSuccess('');
    try {
      const response = await api.post('/pledges', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Pledge created`);
        await fetchPledges();
      } else {
        setError(response.data?.message || 'Failed to create pledge');
      }
    } catch (error) {
      console.error('Error creating pledge:', error);
      setError(error.response?.data?.message || 'Failed to create pledge');
    }
  };

  const handleUpdate = async (data) => {
    setError(''); setSuccess('');
    try {
      const response = await api.put(`/pledges/${selectedPledge.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedPledge(null);
        setSuccess('✅ Pledge updated successfully!');
        await fetchPledges();
      } else {
        setError(response.data?.message || 'Failed to update pledge');
      }
    } catch (error) {
      console.error('Error updating pledge:', error);
      setError(error.response?.data?.message || 'Failed to update pledge');
    }
  };

  const handleDelete = async () => {
    if (!selectedPledge) return;
    setError(''); setSuccess('');
    try {
      const response = await api.delete(`/pledges/${selectedPledge.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedPledge(null);
        setSuccess(response.data.message || '✅ Pledge deleted');
        await fetchPledges();
      } else {
        setError(response.data?.message || 'Failed to delete pledge');
      }
    } catch (error) {
      console.error('Error deleting pledge:', error);
      setError(error.response?.data?.message || 'Failed to delete pledge');
      setShowConfirmModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading pledges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pledges"
        subtitle="Commitments to give"
        actions={
          <button
            onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Record Pledge</span>
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchPledges()}
          placeholder="Search by donor or notes..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <PledgeTable
        pledges={pledges}
        onView={fetchPledgeDetail}
        onEdit={(pledge) => { setSelectedPledge(pledge); setShowEditModal(true); }}
        onDelete={(pledge) => { setSelectedPledge(pledge); setShowConfirmModal(true); }}
      />

      <RecordPledgeModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditPledgeModal
        isOpen={showEditModal}
        pledge={selectedPledge}
        onSubmit={handleUpdate}
        onClose={() => { setShowEditModal(false); setSelectedPledge(null); }}
        error={error}
        setError={setError}
      />

      <PledgeDetailModal
        isOpen={showDetailModal}
        pledge={selectedPledge}
        isLoading={isLoadingDetail}
        onClose={() => { setShowDetailModal(false); setSelectedPledge(null); }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        pledge={selectedPledge}
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmModal(false); setSelectedPledge(null); }}
      />
    </div>
  );
};

export default Pledges;