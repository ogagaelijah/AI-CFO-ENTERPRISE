// frontend/src/components/Sales/SaleDetailModal.jsx
import { X } from 'lucide-react';

const SaleDetailModal = ({ isOpen, sale, isLoading, onClose }) => {
  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    if (status === 'PAID') {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (status === 'PARTIAL') {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  // Parse items
  let items = sale?.items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }
  if (!Array.isArray(items) && typeof items === 'object') {
    const keys = Object.keys(items);
    for (const key of keys) {
      if (Array.isArray(items[key])) { items = items[key]; break; }
    }
    if (!Array.isArray(items)) { items = [items]; }
  }
  if (!Array.isArray(items)) { items = []; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Sale Details #{sale?.invoice_no || sale?.invoiceNo || sale?.id}
          </h2>
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sale details...</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {sale?.customer_name || sale?.customerName || 'Walk-in'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(sale?.sale_date || sale?.date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Payment Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getStatusBadge(sale?.payment_status || sale?.paymentStatus || 'UNPAID')}`}>
                  {sale?.payment_status || sale?.paymentStatus || 'UNPAID'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoice #</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  #{sale?.invoice_no || sale?.invoiceNo || sale?.id}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h3>
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name || 'Item'}</td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{item.quantity || 1}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">₦{(item.costPrice || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">₦{(item.sellingPrice || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                            ₦{((item.quantity || 1) * (item.sellingPrice || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                          No items found for this sale
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost (COGS)</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  ₦{Number(sale?.cogs || sale?.total_cost || sale?.totalCost || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  ₦{Number(sale?.total_price || sale?.totalRevenue || sale?.totalPrice || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
                <p className={`font-bold ${(sale?.gross_profit || sale?.grossProfit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ₦{Number(sale?.gross_profit || sale?.grossProfit || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {sale?.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{sale.notes}</p>
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

export default SaleDetailModal;