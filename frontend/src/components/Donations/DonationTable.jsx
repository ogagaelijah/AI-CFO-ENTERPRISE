// frontend/src/components/Donations/DonationTable.jsx

import { Eye, Edit, Trash2, Heart } from 'lucide-react';

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).slice(0, 10));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  CHEQUE: 'Cheque',
  MOBILE_MONEY: 'Mobile Money',
  OTHER: 'Other',
};

const DonationTable = ({ donations, onView, onEdit, onDelete }) => {
  if (!donations || donations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
        <Heart className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No donations yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Click &ldquo;Record Donation&rdquo; to add the first one.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Donor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {donations.map((donation) => {
              const donor = donation.donorName
                || (donation.isAnonymous || !donation.donorId ? 'Anonymous' : `Donor #${donation.donorId}`);
              const method = METHOD_LABELS[donation.method] || donation.method;

              return (
                <tr key={donation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="font-medium">{donor}</p>
                      {donation.pledgeId && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                          Pledge payment
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {donation.category || 'GENERAL'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {method}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(donation.donationDate)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatCurrency(donation.amount)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(donation.id)}
                        className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(donation)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(donation)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
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

export default DonationTable;