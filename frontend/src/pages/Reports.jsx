// frontend/src/pages/Reports.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Calendar, RefreshCw } from 'lucide-react';

// Import report components
import ExecutiveReport from '../components/Reports/ExecutiveReport';
import ProfitLossReport from '../components/Reports/ProfitLossReport';
import DailyReport from '../components/Reports/DailyReport';
import WeeklyReport from '../components/Reports/WeeklyReport';
import MonthlyReport from '../components/Reports/MonthlyReport';
import YearlyReport from '../components/Reports/YearlyReport';
import CashFlowReport from '../components/Reports/CashFlowReport';
import BalanceSheetReport from '../components/Reports/BalanceSheetReport';

// Report configuration
const REPORT_TYPES = [
  { id: 'executive', label: 'Executive Report', component: ExecutiveReport },
  { id: 'pl', label: 'Profit & Loss', component: ProfitLossReport },
  { id: 'cashflow', label: 'Cash Flow', component: CashFlowReport },
  { id: 'balance-sheet', label: 'Balance Sheet', component: BalanceSheetReport },
  { id: 'daily', label: 'Daily Report', component: DailyReport },
  { id: 'weekly', label: 'Weekly Report', component: WeeklyReport },
  { id: 'monthly', label: 'Monthly Report', component: MonthlyReport },
  { id: 'yearly', label: 'Yearly Report', component: YearlyReport },
];

const CURRENCY_SYMBOL = '₦';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('executive');
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [period, setPeriod] = useState({
    startDate: firstDayOfMonth,
    endDate: today,
  });
  const [date, setDate] = useState(today);
  const [balanceSheetDate, setBalanceSheetDate] = useState(today);

  const getCurrentReport = () => {
    return REPORT_TYPES.find(r => r.id === activeReport) || REPORT_TYPES[0];
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const report = getCurrentReport();
      let endpoint = '';
      let params = { businessId: user?.businessId || user?.id };

      switch (report.id) {
        case 'executive':
          endpoint = '/reports/executive';
          params.startDate = period.startDate;
          params.endDate = period.endDate;
          break;
        case 'pl':
          endpoint = '/reports/pl';
          params.startDate = period.startDate;
          params.endDate = period.endDate;
          break;
        case 'cashflow':
          endpoint = '/reports/cashflow';
          params.startDate = period.startDate;
          params.endDate = period.endDate;
          break;
        case 'balance-sheet':
          endpoint = '/reports/balance-sheet';
          params.asAtDate = balanceSheetDate;
          break;
        case 'daily':
          endpoint = '/reports/daily';
          params.date = date;
          break;
        case 'weekly':
          endpoint = '/reports/weekly';
          params.date = date;
          break;
        case 'monthly':
          endpoint = '/reports/monthly';
          params.date = date;
          break;
        case 'yearly':
          endpoint = '/reports/yearly';
          params.date = date;
          break;
        default:
          endpoint = '/reports/executive';
      }

      const response = await api.get(endpoint, { params });
      
      if (response.data?.success) {
        setReportData(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to load report');
      }

    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeReport, period, date, balanceSheetDate, user]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReportChange = (reportId) => {
    setActiveReport(reportId);
    setReportData(null);
    setError('');
  };

  const ReportComponent = getCurrentReport().component;

  const formatCurrency = (amount) => {
    return `${CURRENCY_SYMBOL}${(amount || 0).toLocaleString()}`;
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <button
          onClick={fetchReport}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleReportChange(type.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeReport === type.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
          </div>

          {(activeReport === 'executive' || activeReport === 'pl' || activeReport === 'cashflow') && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {activeReport === 'balance-sheet' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={balanceSheetDate}
                onChange={(e) => setBalanceSheetDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">(As at Date)</span>
            </div>
          )}

          {(activeReport === 'daily' || activeReport === 'weekly' || activeReport === 'monthly' || activeReport === 'yearly') && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {activeReport === 'daily' && '(Date)'}
                {activeReport === 'weekly' && '(Week of)'}
                {activeReport === 'monthly' && '(Month of)'}
                {activeReport === 'yearly' && '(Year)'}
              </span>
            </div>
          )}

          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
          >
            Generate
          </button>
        </div>
      </div>

      {reportData && (
        <ReportComponent data={reportData} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
      )}
    </div>
  );
};

export default Reports;