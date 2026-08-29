// frontend/src/components/Sales/RecordSaleModal.jsx
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const RecordSaleModal = ({ isOpen, onClose, user, setConfirmData, setError }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    paymentStatus: 'PAID',
    date: new Date().toISOString().split('T')[0],
    items: [{ name: '', quantity: 1, sellingPrice: 0, costPrice: 0, inventoryId: null }],
    notes: '',
    skipInventory: false,
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [showInventoryWarning, setShowInventoryWarning] = useState(false);

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen]);

  const fetchInventoryItems = async () => {
    try {
      setIsLoadingInventory(true);
      const response = await api.get('/inventory', {
        params: { userId: user?.id },
      });
      const items = response.data?.data || response.data || [];
      setInventoryItems(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setShowInventoryWarning(true);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const findInventoryItem = (itemName) => {
    if (!itemName || !itemName.trim()) return null;
    // Case-insensitive search
    return inventoryItems.find(item => 
      item.item_name.toLowerCase() === itemName.trim().toLowerCase()
    );
  };

  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;
    
    // Find inventory item (case-insensitive)
    const inventoryItem = findInventoryItem(value);
    if (inventoryItem && !formData.skipInventory) {
      newItems[index].costPrice = inventoryItem.cost_price || 0;
      newItems[index].sellingPrice = inventoryItem.selling_price || 0;
      newItems[index].inventoryId = inventoryItem.id;
      newItems[index].stock = inventoryItem.quantity || 0;
    } else if (!formData.skipInventory) {
      newItems[index].costPrice = 0;
      newItems[index].sellingPrice = 0;
      newItems[index].inventoryId = null;
      newItems[index].stock = 0;
    }
    
    setFormData({ ...formData, items: newItems });
    setShowInventoryWarning(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, sellingPrice: 0, costPrice: 0, inventoryId: null, stock: 0 }],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    
    // If changing quantity or selling price, update totals
    if (field === 'quantity' || field === 'sellingPrice') {
      const item = newItems[index];
      const costPrice = item.costPrice || 0;
      const sellPrice = item.sellingPrice || 0;
      const qty = item.quantity || 0;
      // Don't auto-calculate sell price from inventory - user sets it
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    for (const item of formData.items) {
      const qty = item.quantity || 0;
      const cost = item.costPrice || 0;
      const sell = item.sellingPrice || 0;
      totalCost += qty * cost;
      totalRevenue += qty * sell;
      totalProfit += qty * (sell - cost);
    }

    return { totalCost, totalRevenue, totalProfit };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate customer name
    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    // Validate items
    const validItems = formData.items.filter(item => item.name.trim());
    if (validItems.length === 0) {
      setError('At least one item with a name is required');
      return;
    }

    // Validate each item
    for (const item of validItems) {
      if (item.quantity <= 0) {
        setError(`Quantity for "${item.name}" must be greater than 0`);
        return;
      }
      if (item.sellingPrice < 0) {
        setError(`Selling price for "${item.name}" cannot be negative`);
        return;
      }
    }

    const { totalCost, totalRevenue, totalProfit } = calculateTotals();

    // Check inventory stock if not skipped
    if (!formData.skipInventory) {
      for (const item of validItems) {
        const inventoryItem = findInventoryItem(item.name);
        if (inventoryItem && inventoryItem.quantity < item.quantity) {
          setError(`Insufficient stock for "${item.name}". Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`);
          return;
        }
      }
    }

    setConfirmData({
      ...formData,
      items: validItems.map(item => ({
        ...item,
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice || 0,
      })),
      totalCost,
      totalRevenue,
      totalProfit,
      amountPaid: 0,
    }, totalRevenue);
  };

  const { totalCost, totalRevenue, totalProfit } = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Sale</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Customer Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
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
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Inventory Warning */}
          {showInventoryWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Could not check inventory. You can still sell without inventory tracking.</span>
            </div>
          )}

          {/* Skip Inventory Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="skipInventory"
              checked={formData.skipInventory}
              onChange={(e) => {
                setFormData({ ...formData, skipInventory: e.target.checked });
                if (e.target.checked) {
                  // Clear inventory data when skipping
                  const newItems = formData.items.map(item => ({
                    ...item,
                    costPrice: 0,
                    inventoryId: null,
                    stock: 0,
                  }));
                  setFormData({ ...formData, skipInventory: true, items: newItems });
                } else {
                  // Re-populate inventory data
                  const newItems = formData.items.map(item => {
                    const inv = findInventoryItem(item.name);
                    return {
                      ...item,
                      costPrice: inv?.cost_price || 0,
                      inventoryId: inv?.id || null,
                      stock: inv?.quantity || 0,
                    };
                  });
                  setFormData({ ...formData, skipInventory: false, items: newItems });
                }
              }}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="skipInventory" className="text-sm text-gray-600 dark:text-gray-400">
              Skip inventory tracking for this sale
            </label>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items *</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-primary-600 dark:text-gold-400 hover:underline"
              >
                + Add Item
              </button>
            </div>

            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="col-span-4">Item Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Cost Price</div>
              <div className="col-span-2 text-center">Sell Price</div>
              <div className="col-span-1 text-center">Total</div>
              <div className="col-span-1"></div>
            </div>

            {formData.items.map((item, index) => {
              const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
              const inventoryItem = findInventoryItem(item.name);
              const stockAvailable = inventoryItem?.quantity || 0;
              const isLowStock = stockAvailable > 0 && stockAvailable < (item.quantity || 0);

              return (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <div className="col-span-4 relative">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="Item name"
                      list={`inventory-suggestions-${index}`}
                    />
                    <datalist id={`inventory-suggestions-${index}`}>
                      {inventoryItems.map(inv => (
                        <option key={inv.id} value={inv.item_name} />
                      ))}
                    </datalist>
                    {!formData.skipInventory && item.name && !inventoryItem && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⚠️ Not in inventory</p>
                    )}
                    {!formData.skipInventory && inventoryItem && item.quantity > 0 && (
                      <p className={`text-xs mt-1 ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {isLowStock ? `⚠️ Only ${stockAvailable} available` : `✅ ${stockAvailable} in stock`}
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    min="1"
                  />
                  <input
                    type="number"
                    value={item.costPrice}
                    onChange={(e) => updateItem(index, 'costPrice', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    min="0"
                    step="0.01"
                    readOnly={!formData.skipInventory && !!inventoryItem}
                  />
                  <input
                    type="number"
                    value={item.sellingPrice}
                    onChange={(e) => updateItem(index, 'sellingPrice', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                    min="0"
                    step="0.01"
                  />
                  <div className="col-span-1 text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                    ₦{itemTotal.toFixed(0)}
                  </div>
                  <div className="col-span-1 text-center">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Totals */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Cost</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">₦{totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Profit</p>
                <p className={`font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ₦{totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
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
              Review Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;