// frontend/src/pages/Suppliers.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Suppliers/SummaryCards';
import SupplierTable from '../components/Suppliers/SupplierTable';
import RecordSupplierModal from '../components/Suppliers/RecordSupplierModal';
import EditSupplierModal from '../components/Suppliers/EditSupplierModal';
import SupplierDetailModal from '../components/Suppliers/SupplierDetailModal';
import ConfirmModal from '../components/Suppliers/ConfirmModal';

const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    withPurchases: 0,
    totalPurchases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch suppliers
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/suppliers', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 100,
        },
      });
      
      if (response.data?.success) {
        const suppliersData = response.data.suppliers || [];
        setSuppliers(suppliersData);
        
        // Calculate summary
        const total = suppliersData.length;
        const active = suppliersData.filter(s => s.metadata?.status !== 'INACTIVE').length;
        const withPurchases = suppliersData.filter(s => s.metadata?.purchaseCount > 0).length;
        const totalPurchases = suppliersData.reduce(
          (sum, s) => sum + (s.metadata?.totalPurchaseAmount || 0), 
          0
        );
        
        setSummary({ total, active, withPurchases, totalPurchases });
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single supplier detail
  const fetchSupplierDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/suppliers/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      if (response.data?.success) {
        setSelectedSupplier(response.data.supplier);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching supplier detail:', error);
      setError('Failed to load supplier details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Create supplier
  const handleCreate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/suppliers', {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Supplier created successfully!');
        await fetchSuppliers();
      } else {
        setError(response.data?.message || 'Failed to create supplier');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      setError(error.response?.data?.message || 'Failed to create supplier');
    }
  };

  // Update supplier
  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/suppliers/${selectedSupplier.id}`, {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedSupplier(null);
        setSuccess('✅ Supplier updated successfully!');
        await fetchSuppliers();
      } else {
        setError(response.data?.message || 'Failed to update supplier');
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      setError(error.response?.data?.message || 'Failed to update supplier');
    }
  };

  // Delete supplier
  const handleDelete = async () => {
    if (!selectedSupplier) return;

    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/suppliers/${selectedSupplier.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedSupplier(null);
        setSuccess('✅ Supplier deleted successfully!');
        await fetchSuppliers();
      } else {
        setError(response.data?.message || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setError(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Supplier</span>
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

      {/* Supplier Table */}
      <SupplierTable
        suppliers={suppliers}
        onView={fetchSupplierDetail}
        onEdit={(supplier) => {
          setSelectedSupplier(supplier);
          setShowEditModal(true);
        }}
        onDelete={(supplier) => {
          setSelectedSupplier(supplier);
          setShowConfirmModal(true);
        }}
      />

      {/* Record Supplier Modal */}
      <RecordSupplierModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      {/* Edit Supplier Modal */}
      <EditSupplierModal
        isOpen={showEditModal}
        supplier={selectedSupplier}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSupplier(null);
        }}
        error={error}
        setError={setError}
      />

      {/* Supplier Detail Modal */}
      <SupplierDetailModal
        isOpen={showDetailModal}
        supplier={selectedSupplier}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSupplier(null);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        supplier={selectedSupplier}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedSupplier(null);
        }}
      />
    </div>
  );
};

export default Suppliers;