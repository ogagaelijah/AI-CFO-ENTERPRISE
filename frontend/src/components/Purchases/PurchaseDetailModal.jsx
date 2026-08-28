// frontend/src/components/Purchases/PurchaseDetailModal.jsx
import { X } from 'lucide-react';

const PurchaseDetailModal = ({ isOpen, purchase, isLoading, onClose }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'PAID') {
      return { label: 'PAID', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    }
    if (status === 'PARTIAL') {
      return { label: 'PARTIAL', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
    return { label: 'UNPAID', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  };

  // ✅ Parse items from purchase - support both formats
  const parseItems = () => {
    if (!purchase) return [];
    
    // If items is already an array
    if (purchase.items && Array.isArray(purchase.items)) {
      return purchase.items;
    }
    
    // If items is a JSON string
    if (purchase.items && typeof purchase.items === 'string') {
      try {
        return JSON.parse(purchase.items);
      } catch (e) {
        return [];
      }
    }
    
    // If item_name is a comma-separated list, try to parse
    if (purchase.item_name && purchase.item_name.includes(',')) {
      const names = purchase.item_name.split(',').map(s => s.trim());
      // If we have quantity and unit_cost, try to distribute
      if (purchase.quantity && purchase.unit_cost) {
        // If there are multiple items, we need the actual items data
        // For now, return a placeholder
        return names.map(name => ({
          name: name,
          quantity: Math.floor(purchase.quantity / names.length) || 1,
          unitCost: purchase.unit_cost || 0,
          sellingPrice: purchase.selling_price || 0,
        }));
      }
      return names.map(name => ({ name, quantity: 1, unitCost: 0, sellingPrice: 0 }));
    }
    
    // Single item
    if (purchase.item_name) {
      return [{
        name: purchase.item_name,
        quantity: purchase.quantity || 0,
        unitCost: purchase.unit_cost || 0,
        sellingPrice: purchase.selling_price || 0,
      }];
    }
    
    return [];
  };

  const items = parseItems();
  
  // Calculate total from items
  const calculateTotal = () => {
    if (items.length > 0) {
      return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    }
    return purchase?.total_cost || 0;
  };

  const totalCost = calculateTotal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading details...</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Supplier Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {purchase?.supplier_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getStatusBadge(purchase?.payment_status || 'UNPAID').color}`}>
                  {purchase?.payment_status || 'UNPAID'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(purchase?.purchase_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoice #</p>
                <p className="font-medium text-gray-900 dark:text-white">#{purchase?.id}</p>
              </div>
            </div>

            {/* ✅ Items Table - Shows each item separately */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h3>
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {items.length > 0 ? (
                      items.map((item, index) => {
                        const itemTotal = (item.quantity || 0) * (item.unitCost || 0);
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name}</td>
                            <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{item.quantity || 1}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                              ₦{(item.unitCost || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">
                              ₦{itemTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                        ₦{totalCost.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                <p className="font-medium text-gray-900 dark:text-white">{items.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Quantity</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average Unit Cost</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  ₦{(totalCost / (items.reduce((sum, item) => sum + (item.quantity || 0), 1))).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Payment Status</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {purchase?.payment_status || 'UNPAID'}
                </p>
              </div>
            </div>

            {purchase?.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{purchase.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseDetailModal;