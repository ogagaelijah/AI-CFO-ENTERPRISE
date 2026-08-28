// frontend/src/components/Customers/CustomerDetailModal.jsx

import { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, FileText, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CustomerDetailModal = ({ isOpen, customer, isLoading, onClose }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      fetchHistory();
    }
  }, [isOpen, customer]);

  const fetchHistory = async () => {
    if (!customer) return;
    try {
      setLoadingHistory(true);
      console.log('🔍 Fetching history for customer ID:', customer.id);
      const response = await api.get(`/customers/${customer.id}/history`, {
        params: { businessId: user?.businessId || user?.id },
      });
      console.log('🔍 History response:', response.data);
      if (response.data?.success) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching customer history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

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

  if (!customer) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Details
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
          {/* Name & Type */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.name}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(customer.type)}`}>
              {customer.type}
            </span>
          </div>

          {/* Contact Info */}
          {customer.phone && (
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">{customer.phone}</p>
              </div>
            </div>
          )}

          {customer.email && (
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white">{customer.email}</p>
              </div>
            </div>
          )}

          {customer.address && (
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-gray-900 dark:text-white">{customer.address}</p>
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </div>
          )}

          {/* Created */}
          <div className="flex items-start space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(customer.createdAt).toLocaleDateString('en-NG', {
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

export default CustomerDetailModal;