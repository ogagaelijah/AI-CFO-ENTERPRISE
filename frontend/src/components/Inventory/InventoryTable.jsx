// frontend/src/components/Inventory/InventoryTable.jsx
import { Edit2, Plus, Minus, Trash2 } from 'lucide-react';

const InventoryTable = ({ items, onEdit, onAdjust, onDelete }) => {
  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  if (!items || items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No inventory items found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Click "Add Stock" to add your first inventory item.
        </p>
      </div>
    );
  }

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: 'text-red-600 dark:text-red-400' };
    if (quantity <= 5) return { label: 'Low Stock', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'In Stock', color: 'text-green-600 dark:text-green-400' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Item</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Cost</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Sell</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Profit/Unit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Margin</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => {
              const profitPerUnit = (item.selling_price || 0) - (item.cost_price || 0);
              const margin = item.cost_price > 0 ? (profitPerUnit / item.cost_price) * 100 : 0;
              const status = getStockStatus(item.quantity);

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {item.item_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                    {item.quantity || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(item.cost_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(item.selling_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(profitPerUnit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {margin > 0 ? `${margin.toFixed(1)}%` : '0%'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAdjust(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        title="Adjust Stock"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;