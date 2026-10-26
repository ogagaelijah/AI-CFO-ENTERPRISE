// frontend/src/components/Sales/RecordSaleModal.jsx
// v3.1.0-prod — Fixes pack selection logic (4 arguments), ensures full inventory fetch,
// and renders clickable Pack buttons.

import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import ReadOnlyBanner from '../common/ReadOnlyBanner';

const RecordSaleModal = ({ isOpen, onClose, user, setConfirmData, setError }) => {
  const { canWrite, guardMessage } = useWriteGuard();

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    paymentStatus: 'PAID',
    date: new Date().toISOString().split('T')[0],
    dueDays: 3, 
    items: [{ name: '', quantity: '', sellingPrice: '', costPrice: '', inventoryId: null, soldUnit: 'Piece', unitMultiplier: 1 }],
    notes: '',
    skipInventory: false,
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [showInventoryWarning, setShowInventoryWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen]);

  const fetchInventoryItems = async () => {
    try {
      setIsLoadingInventory(true);
      // Fetch all inventory items to ensure packs are available
      const response = await api.get('/inventory', {
        params: { userId: user?.id, limit: 1000 },
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
    return inventoryItems.find(item =>
      item.item_name.toLowerCase() === itemName.trim().toLowerCase()
    );
  };

  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;

    const inventoryItem = findInventoryItem(value);
    if (inventoryItem && !formData.skipInventory) {
      // Auto-fill base price
      newItems[index].costPrice = String(inventoryItem.cost_price || '');
      newItems[index].sellingPrice = String(inventoryItem.selling_price || '');
      newItems[index].inventoryId = inventoryItem.id;
      newItems[index].stock = inventoryItem.quantity || 0;
      newItems[index].soldUnit = 'Piece';
      newItems[index].unitMultiplier = 1;
    } else if (!formData.skipInventory) {
      newItems[index].costPrice = '';
      newItems[index].sellingPrice = '';
      newItems[index].inventoryId = null;
      newItems[index].stock = 0;
      newItems[index].soldUnit = 'Piece';
      newItems[index].unitMultiplier = 1;
    }

    setFormData({ ...formData, items: newItems });
    setShowInventoryWarning(false);
  };

  // ★ FIXED: Accepts 4 distinct arguments directly from the button click
  const handleUnitChange = (index, multiplier, unitName, packPrice) => {
    const newItems = [...formData.items];
    const inventoryItem = findInventoryItem(newItems[index].name);
    
    if (!inventoryItem) return;

    newItems[index].unitMultiplier = Number(multiplier) || 1;
    newItems[index].soldUnit = unitName;

    if (unitName !== 'Piece') {
      // For packs, use the specific pack price
      newItems[index].sellingPrice = String(packPrice || '');
      newItems[index].costPrice = String((inventoryItem.cost_price || 0) * (Number(multiplier) || 1));
    } else {
      // For base unit, use base selling price
      newItems[index].sellingPrice = String(inventoryItem.selling_price || '');
      newItems[index].costPrice = String(inventoryItem.cost_price || '');
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: '', sellingPrice: '', costPrice: '', inventoryId: null, stock: 0, soldUnit: 'Piece', unitMultiplier: 1 }],
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
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    for (const item of formData.items) {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.costPrice) || 0;
      const sell = parseFloat(item.sellingPrice) || 0;
      totalCost += qty * cost;
      totalRevenue += qty * sell;
      totalProfit += qty * (sell - cost);
    }

    return { totalCost, totalRevenue, totalProfit };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canWrite) return;
    setError('');

    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    const validItems = formData.items.filter(item => item.name.trim());
    if (validItems.length === 0) {
      setError('At least one item with a name is required');
      return;
    }

    for (const item of validItems) {
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        setError(`Quantity for "${item.name}" must be greater than 0`);
        return;
      }
      if (!item.sellingPrice || parseFloat(item.sellingPrice) < 0) {
        setError(`Selling price for "${item.name}" cannot be negative`);
        return;
      }
    }

    const { totalCost, totalRevenue, totalProfit } = calculateTotals();

    if (!formData.skipInventory) {
      for (const item of validItems) {
        const inventoryItem = findInventoryItem(item.name);
        if (inventoryItem) {
          const requestedBaseStock = parseFloat(item.quantity) * (item.unitMultiplier || 1);
          if (inventoryItem.quantity < requestedBaseStock) {
            setError(`Insufficient stock for "${item.name}". Available: ${inventoryItem.quantity} base units, Requested: ${requestedBaseStock} base units`);
            return;
          }
        }
      }
    }

    setConfirmData({
      ...formData,
      items: validItems.map(item => ({
        ...item,
        costPrice: parseFloat(item.costPrice) || 0,
        sellingPrice: parseFloat(item.sellingPrice) || 0,
        quantity: parseFloat(item.quantity) || 0,
        unitMultiplier: item.unitMultiplier || 1,
        soldUnit: item.soldUnit || 'Piece',
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Sale</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <ReadOnlyBanner />

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {(formData.paymentStatus === 'PARTIAL' || formData.paymentStatus === 'UNPAID') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
              <select
                value={formData.dueDays}
                onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={3}>Due in 3 Days (Default)</option>
                <option value={7}>Due in 7 Days</option>
                <option value={14}>Due in 14 Days</option>
                <option value={30}>Due in 30 Days</option>
              </select>
            </div>
          )}

          {showInventoryWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Could not check inventory. You can still sell without inventory tracking.</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="skipInventory"
              checked={formData.skipInventory}
              onChange={(e) => {
                setFormData({ ...formData, skipInventory: e.target.checked });
                if (e.target.checked) {
                  const newItems = formData.items.map(item => ({ ...item, costPrice: '', inventoryId: null, stock: 0 }));
                  setFormData({ ...formData, skipInventory: true, items: newItems });
                } else {
                  const newItems = formData.items.map(item => {
                    const inv = findInventoryItem(item.name);
                    return { ...item, costPrice: inv?.cost_price ? String(inv.cost_price) : '', inventoryId: inv?.id || null, stock: inv?.quantity || 0 };
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items *</label>
              <button type="button" onClick={addItem} className="text-sm text-primary-600 dark:text-gold-400 hover:underline">
                + Add Item
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="col-span-4">Item & Pack</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Cost</div>
              <div className="col-span-2 text-center">Sell Price</div>
              <div className="col-span-1 text-center">Total</div>
              <div className="col-span-1"></div>
            </div>

            {formData.items.map((item, index) => {
              const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.sellingPrice) || 0);
              const inventoryItem = findInventoryItem(item.name);
              const stockAvailable = inventoryItem?.quantity || 0;
              const requestedBaseStock = (parseFloat(item.quantity) || 0) * (item.unitMultiplier || 1);
              const isLowStock = stockAvailable > 0 && stockAvailable < requestedBaseStock;

              return (
                <div key={index} className="grid grid-cols-12 gap-2 mb-4 items-start bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <div className="col-span-4 space-y-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-medium"
                      placeholder="Item name"
                      list={`inventory-suggestions-${index}`}
                    />
                    <datalist id={`inventory-suggestions-${index}`}>
                      {inventoryItems.map(inv => (
                        <option key={inv.id} value={inv.item_name} />
                      ))}
                    </datalist>
                    
                    {/* ★ PROMINENT PACK SELECTOR BUTTONS */}
                    {inventoryItem && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleUnitChange(index, 1, 'Piece', inventoryItem.selling_price)}
                          className={`px-2 py-1 text-xs rounded border transition ${
                            item.soldUnit === 'Piece' 
                              ? 'bg-primary-600 text-white border-primary-600 font-bold' 
                              : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-primary-400'
                          }`}
                        >
                          1 {inventoryItem.base_unit || 'Piece'} (₦{(inventoryItem.selling_price || 0).toLocaleString()})
                        </button>
                        
                        {(inventoryItem.packs || []).map((p) => (
                          <button
                            key={p.id || p.pack_name}
                            type="button"
                            onClick={() => handleUnitChange(index, p.multiplier, p.pack_name, p.selling_price)}
                            className={`px-2 py-1 text-xs rounded border transition ${
                              item.soldUnit === p.pack_name 
                                ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-blue-400'
                            }`}
                          >
                            {p.pack_name} ({p.multiplier} {inventoryItem.base_unit}) - ₦{(p.selling_price || 0).toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}

                    {!formData.skipInventory && inventoryItem && (
                      <p className={`text-[11px] mt-1 ${isLowStock ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}`}>
                        {isLowStock ? `⚠️ Only ${stockAvailable} base units available` : `✅ ${stockAvailable} base units in stock`}
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center mt-0.5"
                    min="1"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    value={item.costPrice}
                    onChange={(e) => updateItem(index, 'costPrice', e.target.value)}
                    className={`col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center mt-0.5 ${(!formData.skipInventory && inventoryItem) ? 'bg-gray-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-700'}`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    readOnly={!formData.skipInventory && !!inventoryItem}
                  />
                  <input
                    type="number"
                    value={item.sellingPrice}
                    onChange={(e) => updateItem(index, 'sellingPrice', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center mt-0.5 font-medium"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="col-span-1 text-center text-sm font-bold text-blue-600 dark:text-blue-400 mt-2">
                    ₦{itemTotal.toLocaleString()}
                  </div>
                  <div className="col-span-1 text-center mt-1">
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
              disabled={!canWrite}
              title={guardMessage}
              className={`flex-1 px-4 py-2 rounded-lg transition ${
                canWrite
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
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