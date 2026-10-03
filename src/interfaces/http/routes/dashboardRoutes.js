// src/interfaces/http/routes/dashboardRoutes.js
// Aggregated dashboard endpoint — SSOT consumer
// v2.7.0-prod — Adds per-business 60s caches for daily report, cash flow,
//               and risk assessment. Combined with the existing analytics
//               cache, dashboard drops from ~11 concurrent DB calls per
//               request to ~1 on warm cache.
//
//               v2.6.0 → v2.7.0 changes:
//                 - dailyReportService.generate cached 60s
//                   Key: aicfo:daily:{businessId}:{todayStr}
//                 - cashFlowService.generate cached 60s
//                   Key: aicfo:cashflow:{businessId}:{todayStr}
//                 - riskOrchestrator.assess cached 60s
//                   Key: aicfo:risk:{businessId}
//                 - All three keys match aicfo:*:{businessId}* so
//                   invalidateAfterWrite clears them on any write.
//                 - All other behaviour unchanged.

'use strict';

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

// ===== Risk Core =====
const RiskOrchestrator = require('../../../application/services/risk/RiskOrchestrator');
const RiskDataProvider = require('../../../application/services/risk/integration/RiskDataProvider');

// ===== Forecast (pure consumer of Analytics) =====
const ForecastOrchestrator = require('../../../application/services/forecast/ForecastOrchestrator');
const ForecastDataProvider = require('../../../application/services/forecast/integration/ForecastDataProvider');
const ProjectionEngine = require('../../../application/services/forecast/core/ProjectionEngine');

// ===== Analytics (pure consumer of Reports) =====
const AnalyticsProvider = require('../../../application/services/analytics/integration/AnalyticsProvider');
const ReportEngineAdapter = require('../../../application/services/analytics/integration/ReportEngineAdapter');

// ===== Report Services =====
const ProfitLossService = require('../../../application/services/reports/ProfitLossService');
const CashFlowService = require('../../../application/services/reports/CashFlowService');
const BalanceSheetService = require('../../../application/services/reports/BalanceSheetService');
const MonthlyReportService = require('../../../application/services/reports/MonthlyReportService');
const ExecutiveReportService = require('../../../application/services/reports/ExecutiveReportService');
const DailyReportService = require('../../../application/services/reports/DailyReportService');
const WeeklyReportService = require('../../../application/services/reports/WeeklyReportService');
const YearlyReportService = require('../../../application/services/reports/YearlyReportService');
const AgingService = require('../../../application/services/reports/AgingService');
const InventoryReportService = require('../../../application/services/reports/InventoryReportService');

// ===== Repositories =====
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const ReportRepository = require('../../../infrastructure/database/sqlite/repositories/ReportRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');
const InvoiceRepository = require('../../../infrastructure/database/sqlite/repositories/InvoiceRepository');
const StudentRepository = require('../../../infrastructure/database/sqlite/repositories/StudentRepository');

// ===== Initialize Repositories =====
const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const incomeRepo = new IncomeRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const reportRepo = new ReportRepository();
const paymentRepo = new PaymentRepository();
const projectRepo = new ProjectRepository();
const invoiceRepo = new InvoiceRepository();
const studentRepo = new StudentRepository();

// ===== Initialize Report Services =====
const profitLossService = new ProfitLossService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  reportRepository: reportRepo,
});

const cashFlowService = new CashFlowService({
  paymentRepository: paymentRepo,
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  reportRepository: reportRepo,
});

const balanceSheetService = new BalanceSheetService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const dailyReportService = new DailyReportService({
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const weeklyReportService = new WeeklyReportService({
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const monthlyReportService = new MonthlyReportService({
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const yearlyReportService = new YearlyReportService({
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const executiveReportService = new ExecutiveReportService({
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  paymentRepository: paymentRepo,
  reportRepository: reportRepo,
});

const agingService = new AgingService({
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
});

const inventoryReportService = new InventoryReportService({
  inventoryRepository: inventoryRepo,
  saleRepository: saleRepo,
  purchaseRepository: purchaseRepo,
  reportRepository: reportRepo,
});

// ===== Report Engine Adapter =====
const reportEngineAdapter = new ReportEngineAdapter({
  profitLossService,
  cashFlowService,
  balanceSheetService,
  dailyReportService,
  weeklyReportService,
  monthlyReportService,
  yearlyReportService,
  executiveReportService,
  agingService,
  inventoryReportService,
});

// ===== Analytics Provider =====
const analyticsProvider = new AnalyticsProvider({
  reportEngineAdapter,
});

// ===== Forecast stack (pure consumer of Analytics) =====
const forecastDataProvider = new ForecastDataProvider({
  analyticsProvider,
});

const forecastOrchestrator = new ForecastOrchestrator({
  forecastDataProvider,
  projectionEngine: new ProjectionEngine(),
});

// ===== Risk stack (pure consumer of Forecast) =====
const riskDataProvider = new RiskDataProvider({
  forecastProvider: forecastOrchestrator,
});

const riskOrchestrator = new RiskOrchestrator({
  riskDataProvider,
});

// ── Cache TTLs ────────────────────────────────────────────────────
const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
const DAILY_CACHE_TTL_MS = 60 * 1000;
const CASHFLOW_CACHE_TTL_MS = 60 * 1000;
const RISK_CACHE_TTL_MS = 60 * 1000;

// ===== Auth on all routes =====
router.use(authMiddleware);

// =============================================
// GET /api/dashboard/summary
// =============================================
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const businessId = req.user.businessId;

    if (!userId || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // v11: added students.total — discard v10 cache
    const cacheKey = `aicfo:dashboard:${businessId}:daily:v11`;

    const data = await cacheService.getOrSet(
      cacheKey,
      () => fetchDashboardData({ userId, businessId }),
      DASHBOARD_CACHE_TTL_MS
    );

    res.json({
      success: true,
      data,
      cached: cacheService.get(cacheKey, { allowStale: true })?.isStale === false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [Dashboard] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// =============================================
// POST /api/dashboard/health-check
// =============================================
router.post('/health-check', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    message: 'Dashboard service is running',
    cacheStats: stats,
    timestamp: new Date().toISOString(),
  });
});

// =============================================
// Fetch dashboard data (internal)
// =============================================
async function fetchDashboardData({ userId, businessId }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  // ── Cached sub-computations (60s TTL per business) ─────────────
  const dailyKey = `aicfo:daily:${businessId}:${todayStr}`;
  const cashFlowKey = `aicfo:cashflow:${businessId}:${todayStr}`;
  const riskKey = `aicfo:risk:${businessId}`;

  const [
    dailyResult,
    analyticsResult,
    riskResult,
    debtorsTotalRaw,
    creditorsTotalRaw,
    inventorySummary,
    cashFlowResult,
    activeProjectsRaw,
    todayInvoicesRaw,
    cashFlowTodayRaw,
    studentsActiveRaw,
  ] = await Promise.allSettled([
    cacheService.getOrSet(
      dailyKey,
      () => dailyReportService.generate({ userId, businessId, date: todayStr }),
      DAILY_CACHE_TTL_MS
    ),
    analyticsProvider.generateAnalytics({
      userId,
      businessId,
      startDate: startDateStr,
      endDate: todayStr,
      periodType: 'monthly',
    }),
    cacheService.getOrSet(
      riskKey,
      () => riskOrchestrator.assess({ userId, businessId, data: {} }),
      RISK_CACHE_TTL_MS
    ),
    debtorRepo.getTotalOutstanding(businessId),
    creditorRepo.getTotalOutstanding(businessId),
    inventoryRepo.getSummary(businessId),
    cacheService.getOrSet(
      cashFlowKey,
      () => cashFlowService.generate({
        userId,
        businessId,
        startDate: '2000-01-01',
        endDate: todayStr,
      }),
      CASHFLOW_CACHE_TTL_MS
    ),
    projectRepo.countByBusinessId(businessId, { status: 'ACTIVE' }),
    invoiceRepo.countByBusinessId(businessId, { fromDate: todayStr, toDate: todayStr }),
    paymentRepo.getCashFlowForDate(businessId, todayStr),
    studentRepo.countActive(businessId),
  ]);

  const daily = dailyResult.status === 'fulfilled' ? dailyResult.value : null;
  const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
  const risk = riskResult.status === 'fulfilled' ? riskResult.value : null;
  const cashFlow = cashFlowResult.status === 'fulfilled' ? cashFlowResult.value : null;

  const debtorsTotal = debtorsTotalRaw.status === 'fulfilled'
    ? Number(debtorsTotalRaw.value) || 0
    : 0;
  const creditorsTotal = creditorsTotalRaw.status === 'fulfilled'
    ? Number(creditorsTotalRaw.value) || 0
    : 0;
  const inventorySummaryData = inventorySummary.status === 'fulfilled'
    ? inventorySummary.value || {}
    : {};
  const activeProjects = activeProjectsRaw.status === 'fulfilled'
    ? Number(activeProjectsRaw.value) || 0
    : 0;
  const todayInvoices = todayInvoicesRaw.status === 'fulfilled'
    ? Number(todayInvoicesRaw.value) || 0
    : 0;
  const cashFlowToday = cashFlowTodayRaw.status === 'fulfilled'
    ? cashFlowTodayRaw.value || { cashIn: 0, cashOut: 0 }
    : { cashIn: 0, cashOut: 0 };
  const studentsActive = studentsActiveRaw.status === 'fulfilled'
    ? Number(studentsActiveRaw.value) || 0
    : 0;

  // ─────────────────────────────────────────────
  // Navigate analytics (SSOT)
  // ─────────────────────────────────────────────
  const snapshot = analytics?.snapshot || {};
  const analyticsData = analytics?.analytics || {};
  const reportData = analytics?.reportData || {};
  const report = reportData?.report || {};
  const monthly = report?.monthly || {};
  const metrics = reportData?.metrics || {};

  // ─────────────────────────────────────────────
  // Daily report — from daily.today.*
  // ─────────────────────────────────────────────
  const today = daily?.today || {};

  const todayRevenue = Number(today.revenue ?? 0);
  const todaySalesCount = Number(today.salesCount ?? 0);
  const todayExpenses = Number(today.expenses ?? 0);
  const todayProfit = Number(today.netProfit ?? 0);
  const todayNetMargin = Number(today.netMargin ?? 0);

  // ─────────────────────────────────────────────
  // Inventory
  // ─────────────────────────────────────────────
  const inventoryTotal = Number(
    inventorySummaryData.totalValue ?? inventorySummaryData.total_value ??
    metrics.inventory ?? 0
  );
  const lowStockCount = Number(
    inventorySummaryData.lowStockCount ?? inventorySummaryData.low_stock_count ??
    today.inventory?.lowStockCount ?? 0
  );

  // ─────────────────────────────────────────────
  // CASH POSITION — taken from CashFlowService (SSOT)
  // ─────────────────────────────────────────────
  const cashCurrent = Number(cashFlow?.closingCash ?? cashFlow?.summary?.closingCash ?? 0);

  // ─────────────────────────────────────────────
  // Health Score
  // ─────────────────────────────────────────────
  const healthObj = analytics?.health || snapshot?.health || {};

  const healthScore = Number(
    healthObj.score ??
    healthObj.overallScore ??
    0
  );

  const healthStatus =
    healthObj.status ||
    healthObj.overallStatus ||
    'NEUTRAL';

  const topRisks = (risk?.risks?.all || [])
    .filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH')
    .slice(0, 3)
    .map((r) => ({
      type: r.type,
      title: r.title,
      severity: r.severity,
      score: r.score,
      description: r.description,
      recommendation: r.recommendation,
    }));

  const topDecisions = [];

  const forecast = {
    revenue: { forecast: 0, confidence: 0 },
    profit: { forecast: 0, confidence: 0 },
    cashFlow: { forecast: 0, confidence: 0 },
  };

  const kpiResponse = {
    revenue: {
      today: todayRevenue,
      month: Number(monthly.revenue ?? 0),
      growth: 0,
      formatted: `₦${Number(todayRevenue).toLocaleString()}`,
      label: 'Revenue Today',
    },
    profit: {
      today: todayProfit,
      month: Number(monthly.netProfit ?? 0),
      margin: Math.round(todayNetMargin * 100) / 100,
      formatted: `₦${Number(todayProfit).toLocaleString()}`,
      label: 'Profit Today',
    },
    cash: {
      current: cashCurrent,
      flow: cashCurrent,
      formatted: `₦${Number(cashCurrent).toLocaleString()}`,
      label: 'Cash Position',
    },
    cash_in: {
      today: Number(cashFlowToday.cashIn) || 0,
      formatted: `₦${Number(cashFlowToday.cashIn || 0).toLocaleString()}`,
      label: 'Cash Received Today',
    },
    cash_out: {
      today: Number(cashFlowToday.cashOut) || 0,
      formatted: `₦${Number(cashFlowToday.cashOut || 0).toLocaleString()}`,
      label: 'Cash Paid Today',
    },
    receivables: {
      total: debtorsTotal,
      overdue: 0,
      formatted: `₦${Number(debtorsTotal).toLocaleString()}`,
      label: 'Debtors Owed',
    },
    payables: {
      total: creditorsTotal,
      overdue: 0,
      formatted: `₦${Number(creditorsTotal).toLocaleString()}`,
      label: 'You Owe',
    },
    debtors: {
      total: debtorsTotal,
      overdue: 0,
      formatted: `₦${Number(debtorsTotal).toLocaleString()}`,
      label: 'Debtors Owed',
    },
    creditors: {
      total: creditorsTotal,
      overdue: 0,
      formatted: `₦${Number(creditorsTotal).toLocaleString()}`,
      label: 'You Owe',
    },
    inventory: {
      total: inventoryTotal,
      lowStock: lowStockCount,
      formatted: `₦${Number(inventoryTotal).toLocaleString()}`,
      label: 'Inventory Value',
    },
    expenses: {
      today: todayExpenses,
      month: Number(monthly.expenses ?? 0),
      formatted: `₦${Number(todayExpenses).toLocaleString()}`,
      label: 'Expenses Today',
    },
    sales: {
      today: todaySalesCount,
      month: null,
      growth: 0,
      label: 'Sales Today',
    },
    projects: {
      active: activeProjects,
      formatted: String(activeProjects),
      label: 'Active Projects',
    },
    invoices: {
      today: todayInvoices,
      month: null,
      growth: 0,
      formatted: String(todayInvoices),
      label: 'Invoices Today',
    },
    students: {
      total: studentsActive,
      formatted: String(studentsActive),
      label: 'Total Students',
    },
  };

  return {
    kpis: kpiResponse,
    healthScore: {
      score: healthScore,
      status: healthStatus,
      label: healthStatus,
    },
    topRisks,
    topDecisions,
    forecast,
    period: {
      startDate: todayStr,
      endDate: todayStr,
      label: 'Today',
    },
    metadata: {
      userId,
      businessId,
      generatedAt: new Date().toISOString(),
      source: 'cashflow+daily+analytics+risk+repos+projects+invoices+cashinout+students',
      version: '2.7.0',
    },
  };
}

module.exports = router;