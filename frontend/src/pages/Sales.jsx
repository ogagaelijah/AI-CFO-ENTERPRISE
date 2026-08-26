// frontend/src/pages/Sales.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Eye, Edit, Trash2, X, CheckCircle, AlertCircle, Package, AlertTriangle } from 'lucide-react';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    items: [{ name: '', quantity: 1, costPrice: 0, sellingPrice: 0 }],
    paymentStatus: 'PAID',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    inventoryId: null,
    skipInventory: false,
  });
  const [totalCost, setTotalCost] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch sales
  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔍 Fetching sales...');
      
      const response = await api.get('/sales');
      
      let salesData = [];
      if (response.data?.data?.sales) {
        salesData = response.data.data.sales;
      } else if (response.data?.sales) {
        salesData = response.data.sales;
      } else if (Array.isArray(response.data)) {
        salesData = response.data;
      } else {
        salesData = [];
      }
      
      console.log('✅ Extracted sales:', salesData.length);
      setSales(salesData);
      
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      setError('Failed to load sales');
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Fetch single sale details - FIXED to properly parse items
  const fetchSaleDetail = async (saleId) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      
      console.log('🔍 Fetching sale detail for ID:', saleId);
      
      const response = await api.get(`/sales/${saleId}`);
      
      console.log('✅ Sale detail response:', response.data);
      
      let saleData = response.data?.data || response.data;
      
      // ✅ Parse items - handle both string and array formats
      let parsedItems = [];
      
      if (saleData.items) {
        console.log('🔍 Raw items from API:', saleData.items);
        console.log('🔍 Items type:', typeof saleData.items);
        
        if (typeof saleData.items === 'string') {
          try {
            parsedItems = JSON.parse(saleData.items);
            console.log('✅ Parsed items from string:', parsedItems);
          } catch (e) {
            console.warn('⚠️ Could not parse items string:', e);
            parsedItems = [];
          }
        } else if (Array.isArray(saleData.items)) {
          parsedItems = saleData.items;
          console.log('✅ Items already an array:', parsedItems);
        } else if (typeof saleData.items === 'object') {
          // Try to find array inside object
          const keys = Object.keys(saleData.items);
          for (const key of keys) {
            if (Array.isArray(saleData.items[key])) {
              parsedItems = saleData.items[key];
              console.log(`✅ Found items in ${key}:`, parsedItems);
              break;
            }
          }
          if (parsedItems.length === 0) {
            parsedItems = [saleData.items];
          }
        }
      }
      
      // ✅ Fallback: try to get items from other places in response
      if (parsedItems.length === 0) {
        if (response.data?.data?.items) {
          parsedItems = response.data.data.items;
        } else if (response.data?.items) {
          parsedItems = response.data.items;
        }
      }
      
      // ✅ Ensure each item has the correct fields
      parsedItems = parsedItems.map(item => ({
        name: item.name || item.item_name || 'Item',
        quantity: item.quantity || 1,
        costPrice: item.costPrice || item.cost_price || 0,
        sellingPrice: item.sellingPrice || item.selling_price || item.unitPrice || 0,
        total: (item.quantity || 1) * (item.sellingPrice || item.selling_price || item.unitPrice || 0),
        profit: ((item.quantity || 1) * (item.sellingPrice || item.selling_price || item.unitPrice || 0)) - ((item.quantity || 1) * (item.costPrice || item.cost_price || 0)),
      }));
      
      console.log('✅ Final parsed items:', parsedItems);
      
      // ✅ Add parsed items back to saleData
      saleData.items = parsedItems;
      
      setSelectedSale(saleData);
      setShowDetailModal(true);
      
    } catch (error) {
      console.error('❌ Error fetching sale detail:', error);
      setError(error.response?.data?.message || 'Failed to load sale details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Calculate totals
  useEffect(() => {
    let cost = 0;
    let revenue = 0;
    formData.items.forEach(item => {
      cost += (item.quantity * item.costPrice);
      revenue += (item.quantity * item.sellingPrice);
    });
    setTotalCost(cost);
    setTotalRevenue(revenue);
    setTotalProfit(revenue - cost);
  }, [formData.items]);

  // Check inventory for ANY item
  const checkInventory = async (itemName, index) => {
    if (!itemName || itemName.length < 2) {
      setInventoryCheck(null);
      setInventoryError('');
      return;
    }

    setIsCheckingInventory(true);
    setInventoryError('');

    try {
      const response = await api.get(`/inventory?search=${encodeURIComponent(itemName)}`);
      
      if (response.data?.success && response.data.data.items.length > 0) {
        const item = response.data.data.items[0];
        
        const exactMatch = item.item_name.toLowerCase() === itemName.toLowerCase();
        const closeMatch = item.item_name.toLowerCase().includes(itemName.toLowerCase()) || 
                          itemName.toLowerCase().includes(item.item_name.toLowerCase());
        
        if (exactMatch || closeMatch) {
          setInventoryCheck({
            found: true,
            item: item,
            exactMatch: exactMatch,
            itemIndex: index,
          });
          
          const newItems = [...formData.items];
          newItems[index].sellingPrice = item.selling_price || 0;
          newItems[index].costPrice = item.cost_price || 0;
          newItems[index].inventoryId = item.id;
          setFormData({ ...formData, items: newItems });
          
          setInventoryError('');
        } else {
          setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
          setInventoryError(`"${itemName}" not found in inventory. You can still sell without inventory tracking.`);
        }
      } else {
        setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
        setInventoryError(`"${itemName}" not found in inventory. You can still sell without inventory tracking.`);
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
      setInventoryCheck({ found: false, item: null, exactMatch: false, itemIndex: index });
      setInventoryError('Could not check inventory. You can still sell without inventory tracking.');
    } finally {
      setIsCheckingInventory(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, costPrice: 0, sellingPrice: 0, inventoryId: null }],
    });
    setInventoryCheck(null);
    setInventoryError('');
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
      if (inventoryCheck?.itemIndex === index) {
        setInventoryCheck(null);
        setInventoryError('');
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;
    newItems[index].inventoryId = null;
    newItems[index].costPrice = 0;
    newItems[index].sellingPrice = 0;
    setFormData({ ...formData, items: newItems });
    
    if (value && value.length >= 2) {
      checkInventory(value, index);
    } else {
      setInventoryCheck(null);
      setInventoryError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    const hasEmptyItem = formData.items.some(item => !item.name.trim());
    if (hasEmptyItem) {
      setError('All items must have a name');
      return;
    }

    const businessId = user?.businessId || user?.id;
    
    if (!businessId) {
      setError('Business ID not found. Please log out and log in again.');
      return;
    }

    try {
      const saleData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        items: formData.items.map(item => ({
          name: item.name.trim(),
          quantity: parseInt(item.quantity) || 1,
          costPrice: parseFloat(item.costPrice) || 0,
          sellingPrice: parseFloat(item.sellingPrice) || 0,
          inventoryId: item.inventoryId || null,
        })),
        totalCost,
        totalRevenue,
        totalProfit,
        paymentStatus: formData.paymentStatus,
        date: formData.date,
        notes: formData.notes.trim(),
        businessId: businessId,
        skipInventory: formData.skipInventory || false,
      };

      console.log('📤 Sending sale data:', saleData);

      const response = await api.post('/sales', saleData);
      console.log('✅ Sale response:', response.data);

      setSuccess('✅ Sale recorded successfully!');
      setShowModal(false);
      
      setFormData({
        customerName: '',
        customerPhone: '',
        items: [{ name: '', quantity: 1, costPrice: 0, sellingPrice: 0, inventoryId: null }],
        paymentStatus: 'PAID',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        skipInventory: false,
      });
      setInventoryCheck(null);
      setInventoryError('');
      
      fetchSales();
    } catch (error) {
      console.error('❌ Error recording sale:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to record sale');
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
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
            setInventoryCheck(null);
            setInventoryError('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Record Sale</span>
        </button>
      </div>

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
                sales.map((sale) => (
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
                      ₦{Number(sale.total_price || sale.totalRevenue || sale.total_amount || sale.totalPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      <span className={(sale.gross_profit || sale.grossProfit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        ₦{Number(sale.gross_profit || sale.grossProfit || sale.totalProfit || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (sale.payment_status || sale.paymentStatus || 'PENDING') === 'PAID'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : (sale.payment_status || sale.paymentStatus || 'PENDING') === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {sale.payment_status || sale.paymentStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => fetchSaleDetail(sale.id)}
                        className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-gold-400 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ View Sale Detail Modal - FIXED to show items */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Sale Details #{selectedSale.invoice_no || selectedSale.invoiceNo || selectedSale.id}
              </h2>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedSale(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sale details...</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSale.customer_name || selectedSale.customerName || 'Walk-in'}
                    </p>
                    {(selectedSale.customer_phone || selectedSale.customerPhone) && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedSale.customer_phone || selectedSale.customerPhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSale.sale_date || selectedSale.date ? new Date(selectedSale.sale_date || selectedSale.date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payment Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                      (selectedSale.payment_status || selectedSale.paymentStatus || 'PENDING') === 'PAID'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : (selectedSale.payment_status || selectedSale.paymentStatus || 'PENDING') === 'PARTIAL'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedSale.payment_status || selectedSale.paymentStatus || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Invoice #</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      #{selectedSale.invoice_no || selectedSale.invoiceNo || selectedSale.id}
                    </p>
                  </div>
                </div>

                {/* ✅ Items - NOW SHOWING PROPERLY */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h3>
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {(() => {
                          // ✅ Get items - they should already be parsed by fetchSaleDetail
                          let items = selectedSale.items || [];
                          
                          // ✅ If items is still a string, try to parse it
                          if (typeof items === 'string') {
                            try {
                              items = JSON.parse(items);
                            } catch (e) {
                              items = [];
                            }
                          }
                          
                          // ✅ If items is an object but not array, try to extract
                          if (!Array.isArray(items) && typeof items === 'object') {
                            const keys = Object.keys(items);
                            for (const key of keys) {
                              if (Array.isArray(items[key])) {
                                items = items[key];
                                break;
                              }
                            }
                            if (!Array.isArray(items)) {
                              items = [items];
                            }
                          }
                          
                          // ✅ Ensure items is an array
                          if (!Array.isArray(items)) {
                            items = [];
                          }
                          
                          console.log('🔍 Items to display in modal:', items);
                          
                          return items.length > 0 ? (
                            items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name || 'Item'}</td>
                                <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{item.quantity || 1}</td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">₦{(item.costPrice || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">₦{(item.sellingPrice || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                                  ₦{((item.quantity || 1) * (item.sellingPrice || 0)).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                                No items found for this sale
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      ₦{Number(selectedSale.total_cost || selectedSale.totalCost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      ₦{Number(selectedSale.total_price || selectedSale.totalRevenue || selectedSale.totalPrice || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
                    <p className={`font-bold ${(selectedSale.gross_profit || selectedSale.grossProfit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ₦{Number(selectedSale.gross_profit || selectedSale.grossProfit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {(selectedSale.notes) && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedSale.notes}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedSale(null); }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Sale</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="08012345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Items *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-primary-600 dark:text-gold-400 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {isCheckingInventory && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Checking inventory...</span>
                  </div>
                )}

                {inventoryCheck && inventoryCheck.found && (
                  <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Package className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          ✅ Found in inventory: {inventoryCheck.item.item_name}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-green-600 dark:text-green-300">
                          <span>📦 Stock: {inventoryCheck.item.quantity} units</span>
                          <span>💰 Cost: ₦{(inventoryCheck.item.cost_price || 0).toLocaleString()}</span>
                          <span>💲 Sell: ₦{(inventoryCheck.item.selling_price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {inventoryError && !isCheckingInventory && (
                  <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">{inventoryError}</p>
                      <label className="flex items-center space-x-2 mt-1">
                        <input
                          type="checkbox"
                          checked={formData.skipInventory}
                          onChange={(e) => setFormData({ ...formData, skipInventory: e.target.checked })}
                          className="rounded border-gray-300 dark:border-slate-600"
                        />
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          Skip inventory tracking for this sale
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                  <div className="col-span-3">Item Name</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-center">Cost Price</div>
                  <div className="col-span-2 text-center">Sell Price</div>
                  <div className="col-span-2 text-center">Profit</div>
                  <div className="col-span-1"></div>
                </div>

                {formData.items.map((item, index) => {
                  const profit = (item.quantity * item.sellingPrice) - (item.quantity * item.costPrice);
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemNameChange(index, e.target.value)}
                        className="col-span-3 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        placeholder="Item name"
                        required
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                        min="1"
                        required
                      />
                      <input
                        type="number"
                        value={item.costPrice}
                        onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                      />
                      <input
                        type="number"
                        value={item.sellingPrice}
                        onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-center"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                      />
                      <div className="col-span-2 text-center">
                        <span className={`text-xs font-medium ${profit > 0 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                          ₦{profit.toFixed(0)}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total Cost</p>
                    <p className="font-bold text-gray-900 dark:text-white">₦{totalCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="font-bold text-gray-900 dark:text-white">₦{totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total Profit</p>
                    <p className={`font-bold ${totalProfit > 0 ? 'text-green-600 dark:text-green-400' : totalProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      ₦{totalProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;