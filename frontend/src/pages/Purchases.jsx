// frontend/src/pages/Purchases.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import SummaryCards from '../components/Purchases/SummaryCards';
import PurchaseTable from '../components/Purchases/PurchaseTable';
import RecordPurchaseModal from '../components/Purchases/RecordPurchaseModal';
import ConfirmModal from '../components/Purchases/ConfirmModal';
import PurchaseDetailModal from '../components/Purchases/PurchaseDetailModal';
import EditPurchaseModal from '../components/Purchases/EditPurchaseModal';
import PartialPaymentModal from '../components/Purchases/PartialPaymentModal'; // ✅ NEW

const Purchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState({
    total_purchases: 0,
    total_amount: 0,
    total_items: 0,
    average_purchase: 0,
    suppliers_used: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    supplierName: '',
    items: [{ name: '', quantity: 1, unitCost: 0, sellingPrice: 0 }],
    paymentStatus: 'UNPAID',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch purchases
  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/purchases');
      if (response.data?.success) {
        setPurchases(response.data.data.purchases || []);
        setSummary(response.data.data.summary || {
          total_purchases: 0,
          total_amount: 0,
          total_items: 0,
          average_purchase: 0,
          suppliers_used: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setError('Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single purchase detail
  const fetchPurchaseDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/purchases/${id}`);
      if (response.data?.success) {
        setSelectedPurchase(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching purchase detail:', error);
      setError('Failed to load purchase details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ✅ Step 1: Validate and show confirmation or partial modal
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const items = formData.items || [];
    
    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        setError('All items must have a name');
        return;
      }
      if (item.quantity <= 0) {
        setError(`Quantity for "${item.name || 'item'}" must be greater than 0`);
        return;
      }
      if (item.unitCost <= 0) {
        setError(`Unit cost for "${item.name || 'item'}" must be greater than 0`);
        return;
      }
      if (item.sellingPrice <= 0) {
        setError(`Selling price for "${item.name || 'item'}" must be greater than 0`);
        return;
      }
    }

    // ✅ If PARTIAL, show partial payment modal
    if (formData.paymentStatus === 'PARTIAL') {
      setShowModal(false);
      setConfirmData({ ...formData });
      setShowPartialModal(true);
      return;
    }

    // ✅ For PAID or UNPAID, show confirmation directly
    setShowModal(false);
    setConfirmData({ ...formData });
    setShowConfirmModal(true);
  };

  // ✅ Step 2a: Handle partial payment amount
  const handlePartialConfirm = () => {
    const amount = parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    
    // Calculate total cost
    const totalCost = (confirmData.items || []).reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    if (amount > totalCost) {
      setError(`Payment amount (₦${amount.toLocaleString()}) exceeds total (₦${totalCost.toLocaleString()})`);
      return;
    }
    
    setError('');
    setShowPartialModal(false);
    setConfirmData({ ...confirmData, amountPaid: amount });
    setShowConfirmModal(true);
  };

  // ✅ Step 2b: Confirm and save
  const handleConfirm = async () => {
    setError('');
    setSuccess('');

    if (!confirmData) {
      setError('No data to confirm');
      return;
    }

    try {
      const items = confirmData.items.map(item => ({
        name: item.name.trim(),
        quantity: parseInt(item.quantity) || 1,
        unitCost: parseFloat(item.unitCost) || 0,
        sellingPrice: parseFloat(item.sellingPrice) || 0,
      }));

      const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

      const payload = {
        supplierName: confirmData.supplierName?.trim() || null,
        items: items,
        totalCost: totalCost,
        paymentStatus: confirmData.paymentStatus,
        amountPaid: confirmData.amountPaid || 0,
        purchaseDate: confirmData.purchaseDate,
        notes: confirmData.notes?.trim() || '',
        businessId: user?.businessId || user?.id,
      };

      console.log('📤 Sending purchase data:', payload);

      const response = await api.post('/purchases', payload);

      if (response.data?.success) {
        setShowConfirmModal(false);
        setShowPartialModal(false);
        setConfirmData(null);
        setPartialAmount('');
        setFormData({
          supplierName: '',
          items: [{ name: '', quantity: 1, unitCost: 0, sellingPrice: 0 }],
          paymentStatus: 'UNPAID',
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        
        let message = `✅ Purchase recorded successfully! ${items.length} item(s) added to inventory.`;
        if (confirmData.paymentStatus === 'PARTIAL') {
          message += `\n💵 Amount Paid: ₦${(confirmData.amountPaid || 0).toLocaleString()}`;
          message += `\n🔴 Remaining Balance: ₦${(totalCost - (confirmData.amountPaid || 0)).toLocaleString()}`;
          message += `\n🏦 Creditor created for remaining balance.`;
        }
        setSuccess(message);
        await fetchPurchases();
      } else {
        setError(response.data?.message || 'Failed to record purchase');
      }
    } catch (error) {
      console.error('❌ Error recording purchase:', error);
      console.error('❌ Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || 'Failed to record purchase';
      setError(errorMsg);
      setShowConfirmModal(false);
      setShowModal(true);
    }
  };

  // Edit purchase
  const handleEditSubmit = async (updatedData) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/purchases/${selectedPurchase.id}`, {
        supplierName: updatedData.supplierName?.trim() || null,
        paymentStatus: updatedData.paymentStatus,
        purchaseDate: updatedData.purchaseDate,
        notes: updatedData.notes?.trim() || '',
        itemName: updatedData.itemName,
        quantity: updatedData.quantity,
        unitCost: updatedData.unitCost,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedPurchase(null);
        setSuccess('✅ Purchase updated successfully!');
        await fetchPurchases();
      } else {
        setError(response.data?.message || 'Failed to update purchase');
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      setError(error.response?.data?.message || 'Failed to update purchase');
    }
  };

  // Delete purchase
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this purchase record? This will also affect inventory.')) return;

    try {
      const response = await api.delete(`/purchases/${id}`);
      if (response.data?.success) {
        setSuccess('✅ Purchase deleted successfully!');
        await fetchPurchases();
      } else {
        setError(response.data?.message || 'Failed to delete purchase');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      setError(error.response?.data?.message || 'Failed to delete purchase');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
    setShowModal(true);
  };

  const handleCancelPartial = () => {
    setShowPartialModal(false);
    setConfirmData(null);
    setPartialAmount('');
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchases</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
            setConfirmData(null);
            setPartialAmount('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Record Purchase</span>
        </button>
      </div>

      {/* Error/Success */}
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

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Purchase Table */}
      <PurchaseTable
        purchases={purchases}
        onView={fetchPurchaseDetail}
        onEdit={(purchase) => {
          setSelectedPurchase(purchase);
          setShowEditModal(true);
        }}
        onDelete={handleDelete}
      />

      {/* Record Purchase Modal */}
      <RecordPurchaseModal
        isOpen={showModal}
        form={formData}
        setForm={setFormData}
        onSubmit={handleSubmit}
        onClose={() => setShowModal(false)}
        error={error}
      />

      {/* Partial Payment Modal */}
      <PartialPaymentModal
        isOpen={showPartialModal}
        data={confirmData}
        amount={partialAmount}
        setAmount={setPartialAmount}
        onConfirm={handlePartialConfirm}
        onCancel={handleCancelPartial}
        error={error}
        setError={setError}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        isOpen={showDetailModal}
        purchase={selectedPurchase}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPurchase(null);
        }}
      />

      {/* Edit Purchase Modal */}
      <EditPurchaseModal
        isOpen={showEditModal}
        purchase={selectedPurchase}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPurchase(null);
        }}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default Purchases;