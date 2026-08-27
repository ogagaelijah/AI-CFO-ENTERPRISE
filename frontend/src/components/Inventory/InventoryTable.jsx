// frontend/src/components/Inventory/InventoryTable.jsx
import { Package, Edit, Trash2 } from 'lucide-react';

const InventoryTable = ({ items, onAdjust, onEdit, onDelete }) => {
  const getStatus = (item) => {
    if (item.quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🚫' };
    if (item.quantity <= (item.reorder_level || 5)) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⚠️' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' };
  };

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No items in inventory. Add your first item!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sell</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {items.map((item) => {
              const status = getStatus(item);
              const profit = (item.selling_price || 0) - (item.cost_price || 0);
              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {item.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                    ₦{(item.cost_price || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                    ₦{(item.selling_price || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${profit > 0 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      ₦{profit.toLocaleString()}
                      {profit > 0 && ` (${((profit / (item.cost_price || 1)) * 100).toFixed(1)}%)`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => onAdjust(item)}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title="Adjust Stock"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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