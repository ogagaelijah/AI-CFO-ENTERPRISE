// frontend/src/pages/Reports.jsx
// v1.3.2-prod — Adds pagination state for Inventory Movement report.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, RefreshCw, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { reportApi } from '../services/reportService';
import { exportToPDF, exportToExcel } from '../services/exportService';
import {
  mapDailyReport,
  mapWeeklyReport,
  mapMonthlyReport,
  mapYearlyReport,
  mapExecutiveReport,
  mapProfitLossReport,
  mapCashFlowReport,
  mapBalanceSheetReport,
} from '../services/reportMappers';

// Existing Reports
import ExecutiveReport from '../components/Reports/ExecutiveReport';
import ProfitLossReport from '../components/Reports/ProfitLossReport';
import DailyReport from '../components/Reports/DailyReport';
import WeeklyReport from '../components/Reports/WeeklyReport';
import MonthlyReport from '../components/Reports/MonthlyReport';
import YearlyReport from '../components/Reports/YearlyReport';
import CashFlowReport from '../components/Reports/CashFlowReport';
import BalanceSheetReport from '../components/Reports/BalanceSheetReport';

// Inventory Reports
import InventoryMovementReport from '../components/Reports/InventoryMovementReport';
import InventoryValuationReport from '../components/Reports/InventoryValuationReport';

const REPORT_TYPES = [
  { id: 'executive', label: 'Executive Report', component: ExecutiveReport, mapper: mapExecutiveReport },
  { id: 'pl', label: 'Profit & Loss', component: ProfitLossReport, mapper: mapProfitLossReport },
  { id: 'cashflow', label: 'Cash Flow', component: CashFlowReport, mapper: mapCashFlowReport },
  { id: 'balance-sheet', label: 'Balance Sheet', component: BalanceSheetReport, mapper: mapBalanceSheetReport },
  { id: 'inventory-valuation', label: 'Inventory Valuation', component: InventoryValuationReport, mapper: (d) => d },
  { id: 'inventory-movement', label: 'Inventory Movement', component: InventoryMovementReport, mapper: (d) => d },
  { id: 'daily', label: 'Daily Report', component: DailyReport, mapper: mapDailyReport },
  { id: 'weekly', label: 'Weekly Report', component: WeeklyReport, mapper: mapWeeklyReport },
  { id: 'monthly', label: 'Monthly Report', component: MonthlyReport, mapper: mapMonthlyReport },
  { id: 'yearly', label: 'Yearly Report', component: YearlyReport, mapper: mapYearlyReport },
];

const CURRENCY_SYMBOL = '₦';

/**
 * Normalizes the varied response envelopes the backend emits.
 */
const extractReportPayload = (response) => {
  const body = response?.data;
  if (!body) return null;
  if (body.success === true && body.data) return body.data;
  if (body.status === 'SUCCESS' && body.data) return body.data;
  return null;
};

/**
 * Extracts an error message from either envelope shape, if present.
 */
const extractReportError = (response) => {
  const body = response?.data;
  if (!body) return 'Failed to load report';
  if (body.message) return body.message;
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors.join(', ');
  }
  return 'Failed to load report';
};

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('executive');

  const [reportData, setReportData] = useState(null);
  const [rawReportData, setRawReportData] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null);

  // ★ NEW: Pagination state for Movement Report
  const [movementPage, setMovementPage] = useState(1);

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [period, setPeriod] = useState({
    startDate: firstDayOfMonth,
    endDate: today,
  });
  const [date, setDate] = useState(today);
  const [balanceSheetDate, setBalanceSheetDate] = useState(today);

  const getCurrentReport = () => {
    return REPORT_TYPES.find((r) => r.id === activeReport) || REPORT_TYPES[0];
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const report = getCurrentReport();
      let response;

      switch (report.id) {
        case 'executive':
          response = await reportApi.getExecutive(period.startDate, period.endDate);
          break;
        case 'pl':
          response = await reportApi.getPL(period.startDate, period.endDate);
          break;
        case 'cashflow':
          response = await reportApi.getCashFlow(period.startDate, period.endDate);
          break;
        case 'balance-sheet':
          response = await reportApi.getBalanceSheet(balanceSheetDate);
          break;
        case 'inventory-valuation':
          response = await reportApi.getInventoryValuation(balanceSheetDate);
          break;
        case 'inventory-movement':
          // ★ Uses movementPage state
          response = await reportApi.getInventoryMovement(period.startDate, period.endDate, movementPage, 50);
          break;
        case 'daily':
          response = await reportApi.getDaily(date);
          break;
        case 'weekly':
          response = await reportApi.getWeekly(date);
          break;
        case 'monthly':
          response = await reportApi.getMonthly(date);
          break;
        case 'yearly':
          response = await reportApi.getYearly(date);
          break;
        default:
          response = await reportApi.getExecutive(period.startDate, period.endDate);
      }

      const rawData = extractReportPayload(response);

      if (rawData) {
        const mappedData = report.mapper(rawData);
        setReportData(mappedData);
        setRawReportData(rawData);
      } else {
        setError(extractReportError(response));
        setReportData(null);
        setRawReportData(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(
        error.response?.data?.message ||
        error.response?.data?.errors?.[0] ||
        'Failed to load report'
      );
      setReportData(null);
      setRawReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, period, date, balanceSheetDate, movementPage]); // ★ Added movementPage

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReportChange = (reportId) => {
    setActiveReport(reportId);
    setReportData(null);
    setRawReportData(null);
    setError('');
    if (reportId === 'inventory-movement') {
      setMovementPage(1); // Reset page when switching to movement
    }
  };

  const handleExportPDF = async () => {
    if (!rawReportData || exporting) return;
    try {
      setExporting('pdf');
      await new Promise((r) => setTimeout(r, 50));
      exportToPDF(rawReportData, activeReport);
    } catch (err) {
      console.error('Export PDF failed:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!rawReportData || exporting) return;
    try {
      setExporting('excel');
      await new Promise((r) => setTimeout(r, 50));
      exportToExcel(rawReportData, activeReport);
    } catch (err) {
      console.error('Export Excel failed:', err);
      setError('Failed to generate Excel file. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const ReportComponent = getCurrentReport().component;
  const canExport = Boolean(rawReportData) && !loading;

  const formatCurrency = (amount) => {
    const num = Number(amount);
    const safe = Number.isFinite(num) ? num : 0;
    return `${CURRENCY_SYMBOL}${safe.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercentage = (value) => {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return `${safe.toFixed(1)}%`;
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
      <PageHeader
        title="Reports"
        subtitle="Financial statements and business reports"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPDF}
              disabled={!canExport || exporting !== null}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title={canExport ? 'Export as PDF' : 'Generate a report first'}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!canExport || exporting !== null}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title={canExport ? 'Export as Excel' : 'Generate a report first'}
            >
              {exporting === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              onClick={fetchReport}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        }
      />

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

          {(activeReport === 'executive' || activeReport === 'pl' || activeReport === 'cashflow' || activeReport === 'inventory-movement') && (
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

          {(activeReport === 'balance-sheet' || activeReport === 'inventory-valuation') && (
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
            onClick={() => { setMovementPage(1); fetchReport(); }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
          >
            Generate
          </button>
        </div>
      </div>

      {reportData && (
        <ReportComponent 
          data={reportData} 
          formatCurrency={formatCurrency} 
          formatPercentage={formatPercentage}
          // ★ Pass pagination props ONLY to the movement report
          {...(activeReport === 'inventory-movement' && {
            onPageChange: setMovementPage,
            currentPage: movementPage
          })}
        />
      )}
    </div>
  );
};

export default Reports;