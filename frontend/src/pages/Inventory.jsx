// frontend/src/pages/Inventory.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import InventorySummary from '../components/Inventory/InventorySummary';
import InventoryTable from '../components/Inventory/InventoryTable';
import AddStockModal from '../components/Inventory/AddStockModal';
import EditItemModal from '../components/Inventory/EditItemModal';
import AdjustStockModal from '../components/Inventory/AdjustStockModal';
import ConfirmModal from '../components/Inventory/ConfirmModal';
import LowStockAlert from '../components/Inventory/LowStockAlert';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({
    total_items: 0,
    total_quantity: 0,
    total_cost_value: 0,
    total_selling_value: 0,
    total_profit: 0,
    low_stock_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/inventory', {
        params: { userId: user?.id },
      });

      if (response.data?.success) {
        const items = response.data.data || [];
        setInventory(items);

        const summaryData = response.data.summary || {};
        setSummary({
          total_items: summaryData.total_items || 0,
          total_quantity: summaryData.total_quantity || 0,
          total_cost_value: summaryData.total_cost_value || 0,
          total_selling_value: summaryData.total_selling_value || 0,
          total_profit: summaryData.total_profit || 0,
          low_stock_count: summaryData.low_stock_count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError(error.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddStock = async (data) => {
    try {
      const response = await api.post('/inventory', {
        ...data,
        userId: user?.id,
      });

      if (response.data?.success) {
        setShowAddModal(false);
        setSuccess('✅ Stock added successfully!');
        await fetchInventory();
      } else {
        setError(response.data?.message || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      setError(error.response?.data?.message || 'Failed to add stock');
    }
  };

  const handleEditItem = async (id, data) => {
    try {
      const response = await api.put(`/inventory/${id}`, {
        ...data,
        userId: user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedItem(null);
        setSuccess('✅ Item updated successfully!');
        await fetchInventory();
      } else {
        setError(response.data?.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setError(error.response?.data?.message || 'Failed to update item');
    }
  };

  const handleAdjustStock = async (id, data) => {
    try {
      const response = await api.patch(`/inventory/${id}/stock`, {
        ...data,
        userId: user?.id,
      });

      if (response.data?.success) {
        setShowAdjustModal(false);
        setSelectedItem(null);
        setSuccess('✅ Stock adjusted successfully!');
        await fetchInventory();
      } else {
        setError(response.data?.message || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      setError(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      const response = await api.delete(`/inventory/${selectedItem.id}`, {
        params: { userId: user?.id },
      });

      if (response.data?.success) {
        setShowDeleteModal(false);
        setSelectedItem(null);
        setDeleteConfirmData(null);
        setSuccess('✅ Item deleted successfully!');
        await fetchInventory();
      } else {
        setError(response.data?.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setDeleteConfirmData({
      itemName: item.item_name,
      quantity: item.quantity,
      costPrice: item.cost_price,
      sellingPrice: item.selling_price,
    });
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInventory}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Error/Success */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Low Stock Alert */}
      {summary.low_stock_count > 0 && (
        <LowStockAlert count={summary.low_stock_count} />
      )}

      {/* Summary Cards */}
      <InventorySummary summary={summary} />

      {/* Inventory Table */}
      <InventoryTable
        items={inventory}
        onEdit={(item) => {
          setSelectedItem(item);
          setShowEditModal(true);
        }}
        onAdjust={(item) => {
          setSelectedItem(item);
          setShowAdjustModal(true);
        }}
        onDelete={openDeleteModal}
      />

      {/* Modals */}
      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStock}
      />

      <EditItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        onSubmit={handleEditItem}
      />

      <AdjustStockModal
        isOpen={showAdjustModal}
        item={selectedItem}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedItem(null);
        }}
        onSubmit={handleAdjustStock}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        data={deleteConfirmData}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${selectedItem?.item_name}"?`}
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={handleDeleteItem}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
          setDeleteConfirmData(null);
        }}
      />
    </div>
  );
};

export default Inventory;