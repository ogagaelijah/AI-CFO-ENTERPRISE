// frontend/src/pages/Invoices.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Invoices/SummaryCards';
import InvoiceTable from '../components/Invoices/InvoiceTable';
import RecordInvoiceModal from '../components/Invoices/RecordInvoiceModal';
import EditInvoiceModal from '../components/Invoices/EditInvoiceModal';
import InvoiceDetailModal from '../components/Invoices/InvoiceDetailModal';
import RecordInvoicePaymentModal from '../components/Invoices/RecordInvoicePaymentModal';
import ConfirmModal from '../components/Invoices/ConfirmModal';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/invoices', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 100,
        },
      });

      if (response.data?.success) {
        setInvoices(response.data.invoices || []);
        setSummary(response.data.summary || {
          totalCount: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueCount: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError(error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoiceDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/invoices/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      if (response.data?.success) {
        setSelectedInvoice(response.data.invoice);
        setShowDetailModal(true);
      } else {
        setError('Failed to load invoice details');
      }
    } catch (error) {
      console.error('❌ Error fetching invoice detail:', error);
      setError(error.response?.data?.message || 'Failed to load invoice details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/invoices', {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Invoice ${response.data.invoice?.invoiceNumber || ''} created!`);
        await fetchInvoices();
      } else {
        setError(response.data?.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/invoices/${selectedInvoice.id}`, {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedInvoice(null);
        setSuccess('✅ Invoice updated successfully!');
        await fetchInvoices();
      } else {
        setError(response.data?.message || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError(error.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/invoices/${selectedInvoice.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedInvoice(null);
        setSuccess('✅ Invoice deleted successfully!');
        await fetchInvoices();
      } else {
        setError(response.data?.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError(error.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleMarkAsSent = async (invoice) => {
    if (!invoice) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/invoices/${invoice.id}`, {
        status: 'SENT',
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowDetailModal(false);
        setSelectedInvoice(null);
        setSuccess(`✅ Invoice ${invoice.invoiceNumber || ''} marked as sent. Client balance updated.`);
        await fetchInvoices();
      } else {
        setError(response.data?.message || 'Failed to mark invoice as sent');
      }
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      setError(error.response?.data?.message || 'Failed to mark invoice as sent');
    }
  };

  const handleRecordPaymentSubmit = async (data) => {
    if (!selectedInvoice) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/invoices/${selectedInvoice.id}/payments`, {
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowPaymentModal(false);
        setShowDetailModal(false);
        setSelectedInvoice(null);
        setSuccess(
          response.data?.message ||
          `✅ Payment of ₦${Number(data.amount).toLocaleString()} recorded.`
        );
        await fetchInvoices();
      } else {
        setError(response.data?.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording invoice payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleOpenPaymentFromDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(false);
    setShowPaymentModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Client invoices and billing"
        actions={
          <button
            onClick={() => {
              setShowModal(true);
              setError('');
              setSuccess('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Invoice</span>
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SummaryCards summary={summary} />

      <InvoiceTable
        invoices={invoices}
        onView={fetchInvoiceDetail}
        onEdit={(invoice) => {
          setSelectedInvoice(invoice);
          setShowEditModal(true);
        }}
        onDelete={(invoice) => {
          setSelectedInvoice(invoice);
          setShowConfirmModal(true);
        }}
      />

      <RecordInvoiceModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditInvoiceModal
        isOpen={showEditModal}
        invoice={selectedInvoice}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInvoice(null);
        }}
        error={error}
        setError={setError}
      />

      <InvoiceDetailModal
        isOpen={showDetailModal}
        invoice={selectedInvoice}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        onRecordPayment={handleOpenPaymentFromDetail}
        onMarkAsSent={handleMarkAsSent}
      />

      <RecordInvoicePaymentModal
        isOpen={showPaymentModal}
        invoice={selectedInvoice}
        onSubmit={handleRecordPaymentSubmit}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        error={error}
        setError={setError}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        invoice={selectedInvoice}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
};

export default Invoices;