// frontend/src/pages/Inventory.jsx
// v1.2.0-prod — Uses isInitialLoading so search doesn't unmount input.
// v1.1.0-prod — Uses usePaginatedApi hook + Pagination. Server-side search.

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import usePaginatedApi from '../hooks/usePaginatedApi';
import InventorySummary from '../components/Inventory/InventorySummary';
import InventoryTable from '../components/Inventory/InventoryTable';
import AddStockModal from '../components/Inventory/AddStockModal';
import EditItemModal from '../components/Inventory/EditItemModal';
import AdjustStockModal from '../components/Inventory/AdjustStockModal';
import ConfirmModal from '../components/Inventory/ConfirmModal';
import LowStockAlert from '../components/Inventory/LowStockAlert';

const DEFAULT_SUMMARY = {
  total_items: 0,
  total_quantity: 0,
  total_cost_value: 0,
  total_selling_value: 0,
  total_profit: 0,
  low_stock_count: 0,
};

const Inventory = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(urlSearch);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === urlSearch) return;
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          const v = searchInput.trim();
          if (v) sp.set('search', v);
          else sp.delete('search');
          sp.delete('page');
          return sp;
        },
        { replace: true }
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (urlSearch !== searchInput) setSearchInput(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const hookParams = useMemo(
    () => (urlSearch ? { search: urlSearch } : {}),
    [urlSearch]
  );

  const {
    items: inventory,
    pagination,
    extra,
    isInitialLoading,
    error: loadError,
    goToPage,
    refresh,
  } = usePaginatedApi('/inventory', {
    itemKey: 'items',
    params: hookParams,
  });

  const summary = extra?.summary || DEFAULT_SUMMARY;

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);

  const handleAddStock = async (data) => {
    try {
      const response = await api.post('/inventory', { ...data, userId: user?.id });
      if (response.data?.success) {
        setShowAddModal(false);
        setSuccess('✅ Stock added successfully!');
        refresh();
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
      const response = await api.put(`/inventory/${id}`, { ...data, userId: user?.id });
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedItem(null);
        setSuccess('✅ Item updated successfully!');
        refresh();
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
      const response = await api.patch(`/inventory/${id}/stock`, { ...data, userId: user?.id });
      if (response.data?.success) {
        setShowAdjustModal(false);
        setSelectedItem(null);
        setSuccess('✅ Stock adjusted successfully!');
        refresh();
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
      const response = await api.delete(`/inventory/${selectedItem.id}`, { params: { userId: user?.id } });
      if (response.data?.success) {
        setShowDeleteModal(false);
        setSelectedItem(null);
        setDeleteConfirmData(null);
        setSuccess('✅ Item deleted successfully!');
        refresh();
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

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete('search');
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  const displayError = error || loadError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand and valuation"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={refresh}
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
        }
      />

      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{displayError}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {summary.low_stock_count > 0 && (
        <LowStockAlert count={summary.low_stock_count} />
      )}

      <InventorySummary summary={summary} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex space-x-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search inventory by item name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            title="Clear search and refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
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
        <Pagination pagination={pagination} onPageChange={goToPage} />
      </div>

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStock}
      />

      <EditItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
        onSubmit={handleEditItem}
      />

      <AdjustStockModal
        isOpen={showAdjustModal}
        item={selectedItem}
        onClose={() => { setShowAdjustModal(false); setSelectedItem(null); }}
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