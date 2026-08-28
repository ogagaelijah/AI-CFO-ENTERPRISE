// frontend/src/components/Purchases/RecordPurchaseModal.jsx
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const RecordPurchaseModal = ({ isOpen, form, setForm, onSubmit, onClose, error }) => {
  if (!isOpen) return null;

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...(form.items || []), { name: '', quantity: 1, unitCost: 0, sellingPrice: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    if ((form.items || []).length > 1) {
      const newItems = form.items.filter((_, i) => i !== index);
      setForm({ ...form, items: newItems });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...(form.items || [])];
    newItems[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    setForm({ ...form, items: newItems });
  };

  // Initialize with one item if empty
  if (!form.items || form.items.length === 0) {
    setForm({ ...form, items: [{ name: '', quantity: 1, unitCost: 0, sellingPrice: 0 }] });
    return null;
  }

  const calculateItemTotal = (item) => {
    return (item.quantity || 0) * (item.unitCost || 0);
  };

  const calculateGrandTotal = () => {
    return (form.items || []).reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Purchase</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supplier Name (Optional)
            </label>
            <input
              type="text"
              value={form.supplierName || ''}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter supplier name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier Phone (Optional)
              </label>
              <input
                type="tel"
                value={form.supplierPhone || ''}
                onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter supplier phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier Email (Optional)
              </label>
              <input
                type="email"
                value={form.supplierEmail || ''}
                onChange={(e) => setForm({ ...form, supplierEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter supplier email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={form.paymentStatus || 'UNPAID'}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.purchaseDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* ✅ Multi-Item Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Items *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-primary-600 dark:text-gold-400 hover:underline"
              >
                + Add Item
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="col-span-3">Item Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Unit Cost</div>
              <div className="col-span-2 text-center">Sell Price</div>
              <div className="col-span-2 text-center">Total</div>
              <div className="col-span-1"></div>
            </div>

            {(form.items || []).map((item, index) => {
              const itemTotal = calculateItemTotal(item);
              return (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="col-span-3 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Item name"
                    required
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                  <input
                    type="number"
                    value={item.sellingPrice}
                    onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                  <div className="col-span-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                    ₦{itemTotal.toFixed(0)}
                  </div>
                  <div className="col-span-1 text-center">
                    {(form.items || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Items</p>
                <p className="font-bold text-gray-900 dark:text-white">{(form.items || []).length}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Quantity</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {(form.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Grand Total</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  ₦{calculateGrandTotal().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              Record Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPurchaseModal;