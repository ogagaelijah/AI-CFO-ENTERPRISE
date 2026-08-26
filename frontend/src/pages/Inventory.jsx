// frontend/src/pages/Inventory.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Item Form
  const [addForm, setAddForm] = useState({
    itemName: '',
    quantity: 1,
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 5,
  });

  // Adjust Stock Form
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

  // Add item
  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/inventory', {
        itemName: addForm.itemName.trim(),
        quantity: parseInt(addForm.quantity),
        costPrice: parseFloat(addForm.costPrice),
        sellingPrice: parseFloat(addForm.sellingPrice),
        reorderLevel: parseInt(addForm.reorderLevel) || 5,
      });

      if (response.data?.success) {
        setSuccess('✅ Item added successfully!');
        setShowAddModal(false);
        setAddForm({ itemName: '', quantity: 1, costPrice: 0, sellingPrice: 0, reorderLevel: 5 });
        fetchInventory();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add item');
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

  // Get status
  const getStatus = (item) => {
    if (item.quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🚫' };
    if (item.quantity <= (item.reorder_level || 5)) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⚠️' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' };
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
          onClick={() => setShowAddModal(true)}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <Package className="w-4 h-4" />
            <span className="text-xs">Items</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summary.total_items || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <Package className="w-4 h-4" />
            <span className="text-xs">Total Stock</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summary.total_quantity || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs">Cost Value</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">₦{(summary.total_cost_value || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Selling Value</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">₦{(summary.total_selling_value || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs">Potential Profit</span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">₦{(summary.total_profit || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Margin</span>
          </div>
          <p className="text-xl font-bold text-primary-600 dark:text-gold-400 mt-1">{summary.margin || 0}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs">Low Stock</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${summary.low_stock_count > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
            {summary.low_stock_count || 0}
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sell</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No items in inventory. Add your first item!
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const status = getStatus(item);
                  const profit = (item.selling_price || 0) - (item.cost_price || 0);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {item.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                        ₦{(item.cost_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                        ₦{(item.selling_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${profit > 0 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                          ₦{profit.toLocaleString()}
                          {profit > 0 && ` (${((profit / (item.cost_price || 1)) * 100).toFixed(1)}%)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowAdjustModal(true);
                            setAdjustForm({ action: 'add', quantity: 1 });
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title="Adjust Stock"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Inventory Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={addForm.itemName}
                  onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    value={addForm.reorderLevel}
                    onChange={(e) => setAddForm({ ...addForm, reorderLevel: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Price (₦) *
                  </label>
                  <input
                    type="number"
                    value={addForm.costPrice}
                    onChange={(e) => setAddForm({ ...addForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selling Price (₦) *
                  </label>
                  <input
                    type="number"
                    value={addForm.sellingPrice}
                    onChange={(e) => setAddForm({ ...addForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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