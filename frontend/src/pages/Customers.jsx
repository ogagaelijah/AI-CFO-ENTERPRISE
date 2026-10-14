// frontend/src/pages/Customers.jsx
// v1.2.0-prod — Uses usePaginatedApi hook + Pagination. Summary from pagination.
// v1.1.0-prod — Accepts initialType prop. Filters by type when locked.

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import usePaginatedApi from '../hooks/usePaginatedApi';
import SummaryCards from '../components/Customers/SummaryCards';
import CustomerTable from '../components/Customers/CustomerTable';
import RecordCustomerModal from '../components/Customers/RecordCustomerModal';
import EditCustomerModal from '../components/Customers/EditCustomerModal';
import CustomerDetailModal from '../components/Customers/CustomerDetailModal';
import ConfirmModal from '../components/Customers/ConfirmModal';

const TYPE_LABELS = {
  CUSTOMER: { singular: 'Customer', plural: 'Customers' },
  CLIENT:   { singular: 'Client',   plural: 'Clients' },
  DONOR:    { singular: 'Donor',    plural: 'Donors' },
  PATIENT:  { singular: 'Patient',  plural: 'Patients' },
  TENANT:   { singular: 'Tenant',   plural: 'Tenants' },
  STUDENT:  { singular: 'Student',  plural: 'Students' },
};

const Customers = ({ initialType = null }) => {
  const { user } = useAuth();
  const labels = TYPE_LABELS[initialType] || TYPE_LABELS.CUSTOMER;

  const hookParams = useMemo(
    () => (initialType ? { type: initialType } : {}),
    [initialType]
  );

  const {
    items: customers,
    pagination,
    isLoading,
    error: loadError,
    goToPage,
    refresh,
  } = usePaginatedApi('/customers', {
    itemKey: 'customers',
    params: hookParams,
  });

  // Summary derived from pagination.total (server-side, accurate for all pages)
  const summary = {
    total: pagination?.total || 0,
    active: pagination?.total || 0, // Note: was previously computed client-side as metadata?.status !== 'INACTIVE'
  };

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCustomerDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/customers/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      if (response.data?.success) {
        setSelectedCustomer(response.data.customer);
        setShowDetailModal(true);
      } else {
        setError('Failed to load customer details');
      }
    } catch (error) {
      console.error('❌ Error fetching customer detail:', error);
      setError(error.response?.data?.message || 'Failed to load customer details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/customers', {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ ${labels.singular} created successfully!`);
        refresh();
      } else {
        setError(response.data?.message || `Failed to create ${labels.singular.toLowerCase()}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      setError(error.response?.data?.message || `Failed to create ${labels.singular.toLowerCase()}`);
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/customers/${selectedCustomer.id}`, {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedCustomer(null);
        setSuccess(`✅ ${labels.singular} updated successfully!`);
        refresh();
      } else {
        setError(response.data?.message || `Failed to update ${labels.singular.toLowerCase()}`);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error.response?.data?.message || `Failed to update ${labels.singular.toLowerCase()}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/customers/${selectedCustomer.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedCustomer(null);
        setSuccess(`✅ ${labels.singular} deleted successfully!`);
        refresh();
      } else {
        setError(response.data?.message || `Failed to delete ${labels.singular.toLowerCase()}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError(error.response?.data?.message || `Failed to delete ${labels.singular.toLowerCase()}`);
    }
  };

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading {labels.plural.toLowerCase()}...
          </p>
        </div>
      </div>
    );
  }

  const displayError = error || loadError;

  return (
    <div className="space-y-6">
      <PageHeader
        title={labels.plural}
        subtitle={initialType
          ? `Your ${labels.plural.toLowerCase()} records`
          : 'Your customer records'}
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
            <span>Add {labels.singular}</span>
          </button>
        }
      />

      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{displayError}</span>
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

      <SummaryCards summary={summary} entityName={labels.plural} />

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <CustomerTable
          customers={customers}
          entityName={labels.singular.toLowerCase()}
          onView={fetchCustomerDetail}
          onEdit={(customer) => {
            setSelectedCustomer(customer);
            setShowEditModal(true);
          }}
          onDelete={(customer) => {
            setSelectedCustomer(customer);
            setShowConfirmModal(true);
          }}
        />
        <Pagination pagination={pagination} onPageChange={goToPage} />
      </div>

      <RecordCustomerModal
        isOpen={showModal}
        initialType={initialType}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditCustomerModal
        isOpen={showEditModal}
        customer={selectedCustomer}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCustomer(null);
        }}
        error={error}
        setError={setError}
      />

      <CustomerDetailModal
        isOpen={showDetailModal}
        customer={selectedCustomer}
        isLoading={isLoadingDetail}
        entityName={labels.singular}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        customer={selectedCustomer}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedCustomer(null);
        }}
      />
    </div>
  );
};

export default Customers;