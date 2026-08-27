// frontend/src/pages/Sales.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus } from 'lucide-react';
import RecordSaleModal from '../components/Sales/RecordSaleModal';
import SaleDetailModal from '../components/Sales/SaleDetailModal';
import ConfirmModal from '../components/Sales/ConfirmModal';
import PartialPaymentModal from '../components/Sales/PartialPaymentModal';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  
  // Data
  const [selectedSale, setSelectedSale] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/sales');
      let salesData = [];
      if (response.data?.data?.sales) {
        salesData = response.data.data.sales;
      } else if (response.data?.sales) {
        salesData = response.data.sales;
      } else if (Array.isArray(response.data)) {
        salesData = response.data;
      }
      setSales(salesData);
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      setError('Failed to load sales');
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSaleDetail = async (saleId) => {
    try {
      setIsLoadingDetail(true);
      const response = await api.get(`/sales/${saleId}`);
      const saleData = response.data?.data || response.data;
      
      // Parse items if string
      if (saleData.items && typeof saleData.items === 'string') {
        try { saleData.items = JSON.parse(saleData.items); } catch (e) { saleData.items = []; }
      }
      
      setSelectedSale(saleData);
      setShowDetailModal(true);
    } catch (error) {
      console.error('❌ Error fetching sale detail:', error);
      setError('Failed to load sale details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleConfirmSale = async () => {
    const data = confirmData;
    try {
      const saleData = {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        items: data.items.map(item => ({
          name: item.name.trim(),
          quantity: parseInt(item.quantity) || 1,
          costPrice: parseFloat(item.costPrice) || 0,
          sellingPrice: parseFloat(item.sellingPrice) || 0,
          inventoryId: item.inventoryId || null,
        })),
        totalCost: data.totalCost,
        totalRevenue: data.totalRevenue,
        totalProfit: data.totalProfit,
        paymentStatus: data.paymentStatus,
        date: data.date,
        notes: data.notes.trim(),
        businessId: user?.businessId || user?.id,
        skipInventory: data.skipInventory || false,
        amountPaid: data.amountPaid || 0,
      };

      await api.post('/sales', saleData);
      setSuccess(`✅ Sale recorded successfully! Payment: ${saleData.paymentStatus}`);
      
      setShowConfirmModal(false);
      setShowPartialModal(false);
      setConfirmData(null);
      setPartialAmount('');
      fetchSales();
    } catch (error) {
      console.error('❌ Error recording sale:', error);
      setError(error.response?.data?.message || 'Failed to record sale');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
        <button
          onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Record Sale</span>
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">{success}</div>}

      {/* Sales Table - Simplified */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No sales recorded yet. Record your first sale!
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const status = sale.payment_status || sale.paymentStatus || 'UNPAID';
                  const statusColor = status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        #{sale.invoice_no || sale.invoiceNo || String(sale.id)?.slice(0, 8) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {sale.customer_name || sale.customerName || 'Walk-in'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {sale.sale_date || sale.date ? new Date(sale.sale_date || sale.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900 dark:text-white">
                        ₦{Number(sale.total_price || sale.totalRevenue || sale.totalPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        <span className={(sale.gross_profit || sale.grossProfit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          ₦{Number(sale.gross_profit || sale.grossProfit || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => fetchSaleDetail(sale.id)} className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition">👁️</button>
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition">✏️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <RecordSaleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        user={user}
        setConfirmData={(data, revenue) => {
          setConfirmData(data);
          setTotalRevenue(revenue);
          setShowModal(false);
          if (data.paymentStatus === 'PARTIAL') {
            setShowPartialModal(true);
          } else {
            setShowConfirmModal(true);
          }
        }}
        setError={setError}
      />

      <SaleDetailModal
        isOpen={showDetailModal}
        sale={selectedSale}
        isLoading={isLoadingDetail}
        onClose={() => { setShowDetailModal(false); setSelectedSale(null); }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        data={confirmData}
        totalRevenue={totalRevenue}
        onConfirm={handleConfirmSale}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmData(null);
          setShowModal(true);
        }}
      />

      <PartialPaymentModal
        isOpen={showPartialModal}
        data={confirmData}
        totalRevenue={totalRevenue}
        amount={partialAmount}
        setAmount={setPartialAmount}
        onContinue={() => {
          const amount = parseFloat(partialAmount);
          if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid payment amount');
            return;
          }
          if (amount > totalRevenue) {
            setError(`Payment amount exceeds total of ₦${totalRevenue.toLocaleString()}`);
            return;
          }
          setError('');
          setShowPartialModal(false);
          setConfirmData({ ...confirmData, amountPaid: amount });
          setShowConfirmModal(true);
        }}
        onCancel={() => {
          setShowPartialModal(false);
          setConfirmData(null);
          setPartialAmount('');
          setShowModal(true);
        }}
      />
    </div>
  );
};

export default Sales;