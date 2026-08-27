// frontend/src/components/Sales/RecordSaleModal.jsx
import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../../services/api';

const RecordSaleModal = ({ isOpen, onClose, user, setConfirmData, setError }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    items: [{ name: '', quantity: 1, costPrice: 0, sellingPrice: 0, inventoryId: null }],
    paymentStatus: 'PAID',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    skipInventory: false,
  });
  
  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    let cost = 0;
    let revenue = 0;
    formData.items.forEach(item => {
      cost += (item.quantity * item.costPrice);
      revenue += (item.quantity * item.sellingPrice);
    });
    setTotalCost(cost);
    setTotalRevenue(revenue);
    setTotalProfit(revenue - cost);
  }, [formData.items]);

  const checkInventory = async (itemName, index) => {
    if (!itemName || itemName.length < 2) {
      setInventoryCheck(null);
      setInventoryError('');
      return;
    }

    setIsCheckingInventory(true);
    setInventoryError('');

    try {
      const response = await api.get(`/inventory?search=${encodeURIComponent(itemName)}`);
      
      if (response.data?.success && response.data.data.items.length > 0) {
        const item = response.data.data.items[0];
        
        const exactMatch = item.item_name.toLowerCase() === itemName.toLowerCase();
        const closeMatch = item.item_name.toLowerCase().includes(itemName.toLowerCase()) || 
                          itemName.toLowerCase().includes(item.item_name.toLowerCase());
        
        if (exactMatch || closeMatch) {
          setInventoryCheck({
            found: true,
            item: item,
            exactMatch: exactMatch,
            itemIndex: index,
          });
          
          const newItems = [...formData.items];
          newItems[index].sellingPrice = item.selling_price || 0;
          newItems[index].costPrice = item.cost_price || 0;
          newItems[index].inventoryId = item.id;
          setFormData({ ...formData, items: newItems });
          
          setInventoryError('');
        } else {
          setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
          setInventoryError(`"${itemName}" not found in inventory. You can still sell without inventory tracking.`);
        }
      } else {
        setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
        setInventoryError(`"${itemName}" not found in inventory. You can still sell without inventory tracking.`);
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
      setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
      setInventoryError('Could not check inventory. You can still sell without inventory tracking.');
    } finally {
      setIsCheckingInventory(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, costPrice: 0, sellingPrice: 0, inventoryId: null }],
    });
    setInventoryCheck(null);
    setInventoryError('');
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
      if (inventoryCheck?.itemIndex === index) {
        setInventoryCheck(null);
        setInventoryError('');
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;
    newItems[index].inventoryId = null;
    newItems[index].costPrice = 0;
    newItems[index].sellingPrice = 0;
    setFormData({ ...formData, items: newItems });
    
    if (value && value.length >= 2) {
      checkInventory(value, index);
    } else {
      setInventoryCheck(null);
      setInventoryError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    const hasEmptyItem = formData.items.some(item => !item.name.trim());
    if (hasEmptyItem) {
      setError('All items must have a name');
      return;
    }

    const businessId = user?.businessId || user?.id;
    if (!businessId) {
      setError('Business ID not found. Please log out and log in again.');
      return;
    }

    // Pass data to parent to handle confirmation
    setConfirmData({ ...formData, businessId, totalCost, totalRevenue, totalProfit }, totalRevenue);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Sale</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter customer name"
                required
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
                placeholder="08012345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
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
          </div>

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

            {isCheckingInventory && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700 dark:text-blue-400">Checking inventory...</span>
              </div>
            )}

            {inventoryCheck && inventoryCheck.found && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Package className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      ✅ Found in inventory: {inventoryCheck.item.item_name}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-green-600 dark:text-green-300">
                      <span>📦 Stock: {inventoryCheck.item.quantity} units</span>
                      <span>💰 Cost: ₦{(inventoryCheck.item.cost_price || 0).toLocaleString()}</span>
                      <span>💲 Sell: ₦{(inventoryCheck.item.selling_price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {inventoryError && !isCheckingInventory && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">{inventoryError}</p>
                  <label className="flex items-center space-x-2 mt-1">
                    <input
                      type="checkbox"
                      checked={formData.skipInventory}
                      onChange={(e) => setFormData({ ...formData, skipInventory: e.target.checked })}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Skip inventory tracking for this sale
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="col-span-3">Item Name</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Cost Price</div>
              <div className="col-span-2 text-center">Sell Price</div>
              <div className="col-span-2 text-center">Profit</div>
              <div className="col-span-1"></div>
            </div>

            {formData.items.map((item, index) => {
              const profit = (item.quantity * item.sellingPrice) - (item.quantity * item.costPrice);
              return (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemNameChange(index, e.target.value)}
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
                    value={item.costPrice}
                    onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
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
                  <div className="col-span-2 text-center">
                    <span className={`text-xs font-medium ${profit > 0 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      ₦{profit.toFixed(0)}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    {formData.items.length > 1 && (
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
                <p className="text-gray-500 dark:text-gray-400">Total Cost</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="font-bold text-gray-900 dark:text-white">₦{totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Profit</p>
                <p className={`font-bold ${totalProfit > 0 ? 'text-green-600 dark:text-green-400' : totalProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  ₦{totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows="2"
              placeholder="Any additional notes..."
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
              Record Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;