// frontend/src/components/Suppliers/SupplierDetailModal.jsx

import { X, Phone, Mail, MapPin, Building, FileText, Calendar, CreditCard } from 'lucide-react';

const SupplierDetailModal = ({ isOpen, supplier, isLoading, onClose }) => {
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Supplier Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div className="flex items-start space-x-3">
            <Building className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Supplier Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.name}</p>
            </div>
          </div>

          {/* Phone */}
          {supplier.phone && (
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">{supplier.phone}</p>
              </div>
            </div>
          )}

          {/* Email */}
          {supplier.email && (
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white">{supplier.email}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {supplier.address && (
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-gray-900 dark:text-white">{supplier.address}</p>
              </div>
            </div>
          )}

          {/* Tax ID */}
          {supplier.taxId && (
            <div className="flex items-start space-x-3">
              <CreditCard className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tax ID / TIN</p>
                <p className="text-gray-900 dark:text-white">{supplier.taxId}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Purchases</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₦{(supplier.metadata?.totalPurchaseAmount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Count</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {supplier.metadata?.purchaseCount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-start space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(supplier.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailModal;