// frontend/src/components/Donations/DonationDetailModal.jsx

import { X } from 'lucide-react';

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

const DonationDetailModal = ({ isOpen, donation, isLoading, onClose }) => {
  if (!isOpen || !donation) return null;

  const donor = donation.donorName
    || (donation.isAnonymous || !donation.donorId ? 'Anonymous' : `Donor #${donation.donorId}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Donation Details</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(donation.amount)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {donation.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Donor" value={donor} />
              <Field label="Method" value={METHOD_LABELS[donation.method] || donation.method} />
              <Field label="Date" value={formatDate(donation.donationDate)} />
              <Field label="Currency" value={donation.currency || 'NGN'} />
              {donation.referenceNumber && (
                <Field label="Reference #" value={donation.referenceNumber} />
              )}
              {donation.isPledgePayment && (
                <Field
                  label="Pledge"
                  value={`#${donation.pledgeId} (${donation.pledgeStatus || '—'})`}
                />
              )}
            </div>

            {donation.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{donation.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</p>
    <p className="text-sm mt-0.5 text-gray-900 dark:text-gray-100">{value}</p>
  </div>
);

export default DonationDetailModal;