// frontend/src/components/Customers/CustomerTable.jsx

import { Eye, Edit2, Trash2 } from 'lucide-react';

const CustomerTable = ({ customers, onView, onEdit, onDelete }) => {
  if (!customers || customers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No customers found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Click "Add Customer" to create your first customer.
        </p>
      </div>
    );
  }

  const getTypeBadge = (type) => {
    const types = {
      CUSTOMER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      PATIENT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      CLIENT: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      TENANT: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      STUDENT: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    };
    return types[type] || types.CUSTOMER;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                Type
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {customer.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {customer.phone || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {customer.email || '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(customer.type)}`}>
                    {customer.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onView(customer.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(customer)}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(customer)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable;