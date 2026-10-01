// frontend/src/pages/Reports.jsx
// v1.2.0-prod — Keeps raw backend response in a separate state variable
//               so exports get the shape exportService.js expects
//               (revenue.sales, costs.purchases, transactions.sales, …).
//               UI continues to consume the mapped shape.

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

import ExecutiveReport from '../components/Reports/ExecutiveReport';
import ProfitLossReport from '../components/Reports/ProfitLossReport';
import DailyReport from '../components/Reports/DailyReport';
import WeeklyReport from '../components/Reports/WeeklyReport';
import MonthlyReport from '../components/Reports/MonthlyReport';
import YearlyReport from '../components/Reports/YearlyReport';
import CashFlowReport from '../components/Reports/CashFlowReport';
import BalanceSheetReport from '../components/Reports/BalanceSheetReport';

const REPORT_TYPES = [
  { id: 'executive', label: 'Executive Report', component: ExecutiveReport, mapper: mapExecutiveReport },
  { id: 'pl', label: 'Profit & Loss', component: ProfitLossReport, mapper: mapProfitLossReport },
  { id: 'cashflow', label: 'Cash Flow', component: CashFlowReport, mapper: mapCashFlowReport },
  { id: 'balance-sheet', label: 'Balance Sheet', component: BalanceSheetReport, mapper: mapBalanceSheetReport },
  { id: 'daily', label: 'Daily Report', component: DailyReport, mapper: mapDailyReport },
  { id: 'weekly', label: 'Weekly Report', component: WeeklyReport, mapper: mapWeeklyReport },
  { id: 'monthly', label: 'Monthly Report', component: MonthlyReport, mapper: mapMonthlyReport },
  { id: 'yearly', label: 'Yearly Report', component: YearlyReport, mapper: mapYearlyReport },
];

const CURRENCY_SYMBOL = '₦';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('executive');

  // Mapped shape — consumed by the UI ReportComponent.
  const [reportData, setReportData] = useState(null);

  // Raw backend shape — consumed by exportToPDF / exportToExcel.
  // exportService.js reads fields like revenue.sales, costs.purchases,
  // transactions.sales, which exist only on the raw response.
  const [rawReportData, setRawReportData] = useState(null);

  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null); // 'pdf' | 'excel' | null

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
      let rawData;

      switch (report.id) {
        case 'executive':
          response = await reportApi.getExecutive(period.startDate, period.endDate);
          rawData = response.data?.data;
          break;
        case 'pl':
          response = await reportApi.getPL(period.startDate, period.endDate);
          rawData = response.data?.data;
          break;
        case 'cashflow':
          response = await reportApi.getCashFlow(period.startDate, period.endDate);
          rawData = response.data?.data;
          break;
        case 'balance-sheet':
          response = await reportApi.getBalanceSheet(balanceSheetDate);
          rawData = response.data?.data;
          break;
        case 'daily':
          response = await reportApi.getDaily(date);
          rawData = response.data?.data;
          break;
        case 'weekly':
          response = await reportApi.getWeekly(date);
          rawData = response.data?.data;
          break;
        case 'monthly':
          response = await reportApi.getMonthly(date);
          rawData = response.data?.data;
          break;
        case 'yearly':
          response = await reportApi.getYearly(date);
          rawData = response.data?.data;
          break;
        default:
          response = await reportApi.getExecutive(period.startDate, period.endDate);
          rawData = response.data?.data;
      }

      if (response.data?.success && rawData) {
        const mappedData = report.mapper(rawData);
        setReportData(mappedData);
        setRawReportData(rawData);       // ← store raw for exports
      } else {
        setError(response.data?.message || 'Failed to load report');
        setReportData(null);
        setRawReportData(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.response?.data?.message || 'Failed to load report');
      setReportData(null);
      setRawReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, period, date, balanceSheetDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReportChange = (reportId) => {
    setActiveReport(reportId);
    setReportData(null);
    setRawReportData(null);
    setError('');
  };

  const handleExportPDF = async () => {
    if (!rawReportData || exporting) return;
    try {
      setExporting('pdf');
      await new Promise((r) => setTimeout(r, 50)); // let the spinner paint
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