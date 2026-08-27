// frontend/src/pages/Inventory.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Search, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Inventory/SummaryCards';
import InventoryTable from '../components/Inventory/InventoryTable';
import AddItemModal from '../components/Inventory/AddItemModal';
import ConfirmModal from '../components/Inventory/ConfirmModal';

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total_items: 0,
    total_quantity: 0,
    total_cost_value: 0,
    total_selling_value: 0,
    total_profit: 0,
    low_stock_count: 0,
    margin: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms
  const [addForm, setAddForm] = useState({
    itemName: '',
    quantity: 1,
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 5,
  });
  const [adjustForm, setAdjustForm] = useState({
    action: 'add',
    quantity: 1,
  });

  // Fetch inventory
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/inventory');
      if (response.data?.success) {
        setItems(response.data.data.items || []);
        setSummary(response.data.data.summary || {
          total_items: 0,
          total_quantity: 0,
          total_cost_value: 0,
          total_selling_value: 0,
          total_profit: 0,
          low_stock_count: 0,
          margin: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Step 1: Validate and show confirmation
  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addForm.itemName.trim()) {
      setError('Item name is required');
      return;
    }

    if (addForm.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (addForm.costPrice < 0) {
      setError('Cost price cannot be negative');
      return;
    }

    if (addForm.sellingPrice < 0) {
      setError('Selling price cannot be negative');
      return;
    }

    // ✅ Close add modal and show confirmation
    setShowAddModal(false);
    setConfirmData({ ...addForm });
    setShowConfirmModal(true);
  };

  // ✅ Step 2: Confirm and save
  const handleConfirmAdd = async () => {
    setError('');
    setSuccess('');
    setShowConfirmModal(false);

    try {
      const response = await api.post('/inventory', {
        itemName: confirmData.itemName.trim(),
        quantity: parseInt(confirmData.quantity),
        costPrice: parseFloat(confirmData.costPrice),
        sellingPrice: parseFloat(confirmData.sellingPrice),
        reorderLevel: parseInt(confirmData.reorderLevel) || 5,
      });

      if (response.data?.success) {
        setSuccess('✅ Item added successfully!');
        setAddForm({ itemName: '', quantity: 1, costPrice: 0, sellingPrice: 0, reorderLevel: 5 });
        setConfirmData(null);
        fetchInventory();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add item');
      setShowAddModal(true);
    }
  };

  // Edit item
  const handleEditItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/inventory/${selectedItem.id}`, {
        itemName: selectedItem.item_name,
        costPrice: parseFloat(selectedItem.cost_price),
        sellingPrice: parseFloat(selectedItem.selling_price),
        reorderLevel: parseInt(selectedItem.reorder_level) || 5,
      });

      if (response.data?.success) {
        setSuccess('✅ Item updated successfully!');
        setShowEditModal(false);
        setSelectedItem(null);
        fetchInventory();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update item');
    }
  };

  // Adjust stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.patch(`/inventory/${selectedItem.id}/stock`, {
        action: adjustForm.action,
        quantity: parseInt(adjustForm.quantity),
      });

      if (response.data?.success) {
        setSuccess('✅ Stock adjusted successfully!');
        setShowAdjustModal(false);
        setSelectedItem(null);
        setAdjustForm({ action: 'add', quantity: 1 });
        fetchInventory();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  // Delete item
  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await api.delete(`/inventory/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Item deleted successfully!');
        fetchInventory();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete item');
    }
  };

  // Search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchInventory();
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get(`/inventory?search=${encodeURIComponent(searchTerm)}`);
      if (response.data?.success) {
        setItems(response.data.data.items || []);
        setSummary(response.data.data.summary || {
          total_items: 0,
          total_quantity: 0,
          total_cost_value: 0,
          total_selling_value: 0,
          total_profit: 0,
          low_stock_count: 0,
          margin: 0,
        });
      }
    } catch (error) {
      setError('Failed to search inventory');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
        <button
          onClick={() => {
            setShowAddModal(true);
            setError('');
            setSuccess('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search inventory..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              fetchInventory();
            }}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable
        items={items}
        onAdjust={(item) => {
          setSelectedItem(item);
          setShowAdjustModal(true);
          setAdjustForm({ action: 'add', quantity: 1 });
        }}
        onEdit={(item) => {
          setSelectedItem(item);
          setShowEditModal(true);
        }}
        onDelete={handleDeleteItem}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        onConfirm={handleConfirmAdd}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmData(null);
          setShowAddModal(true);
        }}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        form={addForm}
        setForm={setAddForm}
        onSubmit={handleAddItemSubmit}
        onClose={() => setShowAddModal(false)}
        error={error}
      />

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Item</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedItem(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleEditItem} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={selectedItem.item_name || ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, item_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Price (₦)
                  </label>
                  <input
                    type="number"
                    value={selectedItem.cost_price || 0}
                    onChange={(e) => setSelectedItem({ ...selectedItem, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selling Price (₦)
                  </label>
                  <input
                    type="number"
                    value={selectedItem.selling_price || 0}
                    onChange={(e) => setSelectedItem({ ...selectedItem, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  value={selectedItem.reorder_level || 5}
                  onChange={(e) => setSelectedItem({ ...selectedItem, reorder_level: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedItem(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adjust Stock</h2>
              <button
                onClick={() => { setShowAdjustModal(false); setSelectedItem(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Item:</span> {selectedItem.item_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Current Stock:</span> {selectedItem.quantity} units
                </p>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action
                  </label>
                  <select
                    value={adjustForm.action}
                    onChange={(e) => setAdjustForm({ ...adjustForm, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="add">Add Stock (+)</option>
                    <option value="remove">Remove Stock (-)</option>
                    <option value="set">Set Exact Quantity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setShowAdjustModal(false); setSelectedItem(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                  >
                    Adjust Stock
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

export default Inventory;