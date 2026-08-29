// frontend/src/components/Sales/ConfirmModal.jsx
import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, data, totalRevenue, onConfirm, onCancel }) => {
  if (!isOpen || !data) return null;

  const { items = [], totalCost = 0, totalRevenue: rev = 0, totalProfit = 0, customerName, paymentStatus, notes } = data;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Sale</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="font-medium text-gray-700 dark:text-gray-300">Customer:</span> {customerName}</p>
            <p><span className="font-medium text-gray-700 dark:text-gray-300">Payment:</span> {paymentStatus}</p>
          </div>

          {/* Items */}
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Sell</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {items.map((item, idx) => {
                  const qty = item.quantity || 0;
                  const cost = item.costPrice || 0;
                  const sell = item.sellingPrice || 0;
                  const total = qty * sell;
                  const profit = qty * (sell - cost);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{qty}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₦{cost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₦{sell.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">₦{total.toLocaleString()}</td>
                      <td className={`px-3 py-2 text-right font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ₦{profit.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-700 font-bold">
                <tr>
                  <td colSpan="3" className="px-3 py-2 text-right text-gray-900 dark:text-white">Totals:</td>
                  <td className="px-3 py-2 text-right text-gray-900 dark:text-white">₦{totalCost.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">₦{rev.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₦{totalProfit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Notes:</span> {notes}
            </p>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              Confirm Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;