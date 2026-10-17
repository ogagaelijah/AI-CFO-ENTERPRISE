// frontend/src/components/Reports/InventoryMovementReport.jsx
// v1.1.0-prod — Adds pagination controls.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const InventoryMovementReport = ({ data, formatCurrency, onPageChange, currentPage }) => {
  const [expandedItem, setExpandedItem] = useState(null);

  if (!data || !data.items) return null;

  const toggleItem = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const pagination = data.pagination || { page: 1, totalPages: 1, hasNext: false, hasPrev: false };

  const handleNextPage = () => {
    if (pagination.hasNext && onPageChange) onPageChange(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (pagination.hasPrev && onPageChange) onPageChange(currentPage - 1);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total In</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.summary.totalIn}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Out</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.totalOut}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Net Change</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.summary.netChange}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cost Value In</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.summary.totalCostIn)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Opening</th>
                <th className="px-4 py-3 font-medium text-right text-green-600 dark:text-green-400">In</th>
                <th className="px-4 py-3 font-medium text-right text-red-600 dark:text-red-400">Out</th>
                <th className="px-4 py-3 font-medium text-right text-orange-600 dark:text-orange-400">Adj</th>
                <th className="px-4 py-3 font-medium text-right">Closing</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {data.items.map((item) => (
                <>
                  <tr 
                    key={item.inventoryItemId} 
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition"
                    onClick={() => toggleItem(item.inventoryItemId)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {expandedItem === item.inventoryItemId ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.openingQuantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">+{item.totalIn}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">-{item.totalOut}</td>
                    <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">{item.adjustments !== 0 ? item.adjustments : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{item.closingQuantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{formatCurrency(item.closingValue)}</td>
                  </tr>
                  
                  {/* Expanded Detail */}
                  {expandedItem === item.inventoryItemId && (
                    <tr>
                      <td colSpan="7" className="p-0 bg-gray-50 dark:bg-slate-900/50">
                        <div className="p-4 border-l-4 border-primary-500 pl-6">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Movement Ledger</h4>
                          {item.movements.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No movements recorded.</p>
                          ) : (
                            <ul className="space-y-3">
                              {item.movements.map((m, idx) => (
                                <li key={idx} className="flex items-center justify-between text-sm border-b border-gray-200 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      ['IN', 'ADJUSTMENT_IN', 'RETURN'].includes(m.movementType) 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {m.movementType}
                                    </span>
                                    <div>
                                      <p className="text-gray-900 dark:text-white font-medium">Qty: {m.quantity} (Before: {m.quantityBefore} → After: {m.quantityAfter})</p>
                                      <p className="text-xs text-gray-500">{m.referenceType} {m.referenceId ? `#${m.referenceId}` : ''} • {m.reason}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-gray-900 dark:text-white">{formatCurrency(m.totalCost)}</p>
                                    <p className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* ★ NEW: Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.totalPages}</span>
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryMovementReport;