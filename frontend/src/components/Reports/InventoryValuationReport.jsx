// frontend/src/components/Reports/InventoryValuationReport.jsx
// v1.0.0-prod — Renders the current inventory valuation snapshot.

import { Package, TrendingUp, AlertTriangle } from 'lucide-react';

const InventoryValuationReport = ({ data, formatCurrency }) => {
  if (!data || !data.items) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Items</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-indigo-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Qty</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalQuantity}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.summary.totalCostValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pot. Profit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.summary.totalPotentialProfit)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Cost Price</th>
                <th className="px-4 py-3 font-medium text-right">Selling Price</th>
                <th className="px-4 py-3 font-medium text-right">Margin</th>
                <th className="px-4 py-3 font-medium text-right">Cost Value</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.costPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.margin}%</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.value)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      item.status === 'IN_STOCK' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryValuationReport;