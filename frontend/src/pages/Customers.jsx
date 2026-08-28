// frontend/src/pages/Customers.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Customers/SummaryCards';
import CustomerTable from '../components/Customers/CustomerTable';
import RecordCustomerModal from '../components/Customers/RecordCustomerModal';
import EditCustomerModal from '../components/Customers/EditCustomerModal';
import CustomerDetailModal from '../components/Customers/CustomerDetailModal';
import ConfirmModal from '../components/Customers/ConfirmModal';

const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/customers', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 100,
        },
      });
      
      if (response.data?.success) {
        const customersData = response.data.customers || [];
        setCustomers(customersData);
        
        // Calculate summary
        const total = customersData.length;
        const active = customersData.filter(c => c.metadata?.status !== 'INACTIVE').length;
        
        setSummary({ total, active });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single customer detail
  const fetchCustomerDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      console.log('🔍 Fetching customer detail for ID:', id);
      const response = await api.get(`/customers/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      console.log('🔍 Customer detail response:', response.data);
      if (response.data?.success) {
        setSelectedCustomer(response.data.customer);
        setShowDetailModal(true);
      } else {
        setError('Failed to load customer details');
      }
    } catch (error) {
      console.error('❌ Error fetching customer detail:', error);
      console.error('❌ Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load customer details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Create customer
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
        setSuccess('✅ Customer created successfully!');
        await fetchCustomers();
      } else {
        setError(response.data?.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      setError(error.response?.data?.message || 'Failed to create customer');
    }
  };

  // Update customer
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
        setSuccess('✅ Customer updated successfully!');
        await fetchCustomers();
      } else {
        setError(response.data?.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error.response?.data?.message || 'Failed to update customer');
    }
  };

  // Delete customer
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
        setSuccess('✅ Customer deleted successfully!');
        await fetchCustomers();
      } else {
        setError(response.data?.message || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Customer</span>
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

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
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

      {/* Record Customer Modal */}
      <RecordCustomerModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      {/* Edit Customer Modal */}
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

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={showDetailModal}
        customer={selectedCustomer}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
      />

      {/* Confirm Delete Modal */}
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