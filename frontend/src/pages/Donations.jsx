// frontend/src/pages/Donations.jsx

import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Donations/SummaryCards';
import DonationTable from '../components/Donations/DonationTable';
import RecordDonationModal from '../components/Donations/RecordDonationModal';
import EditDonationModal from '../components/Donations/EditDonationModal';
import DonationDetailModal from '../components/Donations/DonationDetailModal';
import ConfirmModal from '../components/Donations/ConfirmModal';

const Donations = () => {
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0, totalAmount: 0, anonymousCount: 0,
    pledgePaymentCount: 0, last30Days: 0, todayTotal: 0, donorCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchDonations(); }, [categoryFilter, methodFilter]);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (categoryFilter) params.category = categoryFilter;
      if (methodFilter) params.method = methodFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/donations', { params });
      if (response.data?.success) {
        setDonations(response.data.donations || []);
        setSummary(response.data.summary || {
          totalCount: 0, totalAmount: 0, anonymousCount: 0,
          pledgePaymentCount: 0, last30Days: 0, todayTotal: 0, donorCount: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError(error.response?.data?.message || 'Failed to load donations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDonationDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/donations/${id}`);
      if (response.data?.success) {
        setSelectedDonation(response.data.donation);
        setShowDetailModal(true);
      } else {
        setError('Failed to load donation details');
      }
    } catch (error) {
      console.error('Error fetching donation detail:', error);
      setError(error.response?.data?.message || 'Failed to load donation details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError(''); setSuccess('');
    try {
      const response = await api.post('/donations', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Donation of ₦${Number(data.amount).toLocaleString()} recorded`);
        await fetchDonations();
      } else {
        setError(response.data?.message || 'Failed to record donation');
      }
    } catch (error) {
      console.error('Error recording donation:', error);
      setError(error.response?.data?.message || 'Failed to record donation');
    }
  };

  const handleUpdate = async (data) => {
    setError(''); setSuccess('');
    try {
      const response = await api.put(`/donations/${selectedDonation.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedDonation(null);
        setSuccess('✅ Donation updated successfully!');
        await fetchDonations();
      } else {
        setError(response.data?.message || 'Failed to update donation');
      }
    } catch (error) {
      console.error('Error updating donation:', error);
      setError(error.response?.data?.message || 'Failed to update donation');
    }
  };

  const handleDelete = async () => {
    if (!selectedDonation) return;
    setError(''); setSuccess('');
    try {
      const response = await api.delete(`/donations/${selectedDonation.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedDonation(null);
        setSuccess(response.data.message || '✅ Donation deleted');
        await fetchDonations();
      } else {
        setError(response.data?.message || 'Failed to delete donation');
      }
    } catch (error) {
      console.error('Error deleting donation:', error);
      setError(error.response?.data?.message || 'Failed to delete donation');
      setShowConfirmModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        subtitle="Money received"
        actions={
          <button
            onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Record Donation</span>
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
          onKeyDown={(e) => e.key === 'Enter' && fetchDonations()}
          placeholder="Search by donor, notes, or reference..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          <option value="TITHE">Tithe</option>
          <option value="OFFERING">Offering</option>
          <option value="ZAKAT">Zakat</option>
          <option value="SADAQAH">Sadaqah</option>
          <option value="SEED">Seed</option>
          <option value="BUILDING_FUND">Building Fund</option>
          <option value="MISSIONS">Missions</option>
          <option value="WELFARE">Welfare</option>
          <option value="PLEDGE_PAYMENT">Pledge Payment</option>
          <option value="GENERAL">General</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="POS">POS</option>
          <option value="CHEQUE">Cheque</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <DonationTable
        donations={donations}
        onView={fetchDonationDetail}
        onEdit={(donation) => { setSelectedDonation(donation); setShowEditModal(true); }}
        onDelete={(donation) => { setSelectedDonation(donation); setShowConfirmModal(true); }}
      />

      <RecordDonationModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditDonationModal
        isOpen={showEditModal}
        donation={selectedDonation}
        onSubmit={handleUpdate}
        onClose={() => { setShowEditModal(false); setSelectedDonation(null); }}
        error={error}
        setError={setError}
      />

      <DonationDetailModal
        isOpen={showDetailModal}
        donation={selectedDonation}
        isLoading={isLoadingDetail}
        onClose={() => { setShowDetailModal(false); setSelectedDonation(null); }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        donation={selectedDonation}
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirmModal(false); setSelectedDonation(null); }}
      />
    </div>
  );
};

export default Donations;