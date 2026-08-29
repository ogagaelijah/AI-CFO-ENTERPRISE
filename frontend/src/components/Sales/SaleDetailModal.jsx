// frontend/src/components/Sales/SaleDetailModal.jsx
import { X } from 'lucide-react';

const SaleDetailModal = ({ isOpen, sale, isLoading, onClose }) => {
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!sale) return null;

  const items = sale.items || [];
  const statusColor = sale.payment_status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      sale.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sale Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Customer</p>
              <p className="font-medium text-gray-900 dark:text-white">{sale.customer_name || 'Walk-in'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Payment Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>{sale.payment_status}</span>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Invoice #</p>
              <p className="font-medium text-gray-900 dark:text-white">{sale.invoice_no || `#${sale.id}`}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Sell Price</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">COGS</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">No items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const qty = item.quantity || 0;
                    const cost = item.costPrice || item.unitCost || 0;
                    const sell = item.sellingPrice || item.unitPrice || 0;
                    const total = qty * sell;
                    const cogs = qty * cost;
                    const profit = total - cogs;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{qty}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₦{cost.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₦{sell.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">₦{total.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-orange-600 dark:text-orange-400">₦{cogs.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ₦{profit.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-700 font-bold">
                <tr>
                  <td colSpan="4" className="px-3 py-2 text-right text-gray-900 dark:text-white">Totals:</td>
                  <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">₦{(sale.total_price || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">₦{(sale.cogs || 0).toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${(sale.gross_profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₦{(sale.gross_profit || 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {sale.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Notes:</span> {sale.notes}
            </p>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;