// src/interfaces/http/routes/dashboardRoutes.js
// Aggregated dashboard endpoint — SSOT consumer
// v1.3.0-prod | Daily-first KPIs + debtors/creditors aliases | 10K+ users ready

'use strict';

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

// ===== Engines (SSOT consumers) =====
const AnalyticsProvider = require('../../../application/services/analytics/integration/AnalyticsProvider');
const ReportEngineAdapter = require('../../../application/services/analytics/integration/ReportEngineAdapter');
const RiskOrchestrator = require('../../../application/services/risk/RiskOrchestrator');

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

// ===== Initialize Report Services =====
const profitLossService = new ProfitLossService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  reportRepository: reportRepo,
});

const cashFlowService = new CashFlowService({
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
  reportRepository: reportRepo,
});

const dailyReportService = new DailyReportService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});

const weeklyReportService = new WeeklyReportService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});

const monthlyReportService = new MonthlyReportService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});

const yearlyReportService = new YearlyReportService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});

const executiveReportService = new ExecutiveReportService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
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

// ===== Risk Orchestrator =====
const riskOrchestrator = new RiskOrchestrator({
  reportService: reportEngineAdapter,
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  paymentRepository: paymentRepo,
  debtorRepository: debtorRepo,
  creditorRepository: creditorRepo,
  inventoryRepository: inventoryRepo,
  logger: console,
});

// ===== Apply auth to all routes =====
router.use(authMiddleware);

// =============================================
// GET /api/dashboard/summary
// =============================================
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId;

    if (!userId || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // v2 cache key — drops old zeros after alias fix
    const cacheKey = `aicfo:dashboard:${businessId}:daily:v2`;

    const data = await cacheService.getOrSet(
      cacheKey,
      () => fetchDashboardData({ userId, businessId }),
      2 * 60 * 1000
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

  // Repo signatures: getTotalOutstanding(businessId, userId = null)
  const [
    dailyResult,
    analyticsResult,
    riskResult,
    debtorsTotalRaw,
    creditorsTotalRaw,
    inventorySummary,
  ] = await Promise.allSettled([
    dailyReportService.generate({
      userId,
      businessId,
      date: todayStr,
    }),
    analyticsProvider.generateAnalytics({
      userId,
      businessId,
      startDate: startDateStr,
      endDate: todayStr,
      periodType: 'monthly',
    }),
    riskOrchestrator.assess({
      userId,
      businessId,
      data: {},
    }),
    debtorRepo.getTotalOutstanding(businessId, userId),
    creditorRepo.getTotalOutstanding(businessId, userId),
    inventoryRepo.getSummary(userId),
  ]);

  const daily = dailyResult.status === 'fulfilled' ? dailyResult.value : null;
  const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
  const risk = riskResult.status === 'fulfilled' ? riskResult.value : null;

  const debtorsTotal = debtorsTotalRaw.status === 'fulfilled'
    ? Number(debtorsTotalRaw.value) || 0
    : 0;
  const creditorsTotal = creditorsTotalRaw.status === 'fulfilled'
    ? Number(creditorsTotalRaw.value) || 0
    : 0;
  const inventorySummaryData = inventorySummary.status === 'fulfilled'
    ? inventorySummary.value || {}
    : {};

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [Dashboard] Raw repo values:', {
      debtorsTotal,
      creditorsTotal,
      inventoryTotal: inventorySummaryData.totalValue ?? inventorySummaryData.total_value,
      userId,
      businessId,
    });
  }

  // ─────────────────────────────────────────────
  // Navigate analytics structure
  // ─────────────────────────────────────────────
  const snapshot = analytics?.snapshot || {};
  const analyticsData = analytics?.analytics || {};
  const reportData = analytics?.reportData || {};
  const report = reportData?.report || {};
  const monthly = report?.monthly || {};
  const metrics = reportData?.metrics || {};
  const kpis = analyticsData?.kpis || snapshot?.kpis || {};

  const getKpiValue = (kpi) => {
    if (kpi === null || kpi === undefined) return 0;
    if (typeof kpi === 'number') return kpi;
    if (typeof kpi === 'object') {
      return Number(kpi.value ?? kpi.amount ?? kpi.forecast ?? 0);
    }
    return Number(kpi) || 0;
  };

  // ─────────────────────────────────────────────
  // Daily report structure
  // ─────────────────────────────────────────────
  const dailySummary = daily?.summary || daily || {};
  const dailyKpis = daily?.kpis || daily?.kpiDashboard || {};
  const dailySales = daily?.sales || {};
  const dailyCash = daily?.cash || {};
  const dailyExpenses = daily?.expenses || {};
  const dailyProfit = daily?.profit || daily?.profitability || {};

  const todayRevenue = Number(
    dailySummary.revenue ?? dailyKpis.revenue ??
    dailySales.total ?? dailySales.revenue ?? 0
  );
  const todaySalesCount = Number(
    dailySummary.salesCount ?? dailyKpis.totalSales ??
    dailySales.count ?? dailySales.salesCount ?? 0
  );
  const todayExpenses = Number(
    dailySummary.expenses ?? dailyKpis.expenses ??
    dailyExpenses.total ?? dailyExpenses.totalExpenses ?? 0
  );
  const todayProfit = Number(
    dailySummary.netProfit ?? dailySummary.profit ??
    dailyKpis.netProfit ?? dailyProfit.netProfit ?? dailyProfit.amount ?? 0
  );
  const todayNetMargin = Number(
    dailySummary.netMargin ?? dailyKpis.netMargin ??
    dailyProfit.netMargin ?? 0
  );

  const inventoryTotal = Number(
    inventorySummaryData.totalValue ?? inventorySummaryData.total_value ??
    metrics.inventory ?? 0
  );
  const lowStockCount = Number(
    inventorySummaryData.lowStockCount ?? inventorySummaryData.low_stock_count ?? 0
  );

  const receivablesTotal = debtorsTotal;
  const payablesTotal = creditorsTotal;

  const cashCurrent = Number(
    dailyCash.closingCash ?? dailyCash.closing ??
    dailySummary.cash ?? metrics.cash ??
    getKpiValue(kpis.netCashFlow) ?? 0
  );

  const healthScore = Number(snapshot?.health?.overallScore ?? 0);
  const healthStatus = snapshot?.health?.overallStatus || 'NEUTRAL';

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

  // ─────────────────────────────────────────────
  // KPI response — includes debtors/creditors aliases
  // so industryConfig keys (debtors / creditors) work
  // ─────────────────────────────────────────────
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

    // Canonical keys
    receivables: {
      total: receivablesTotal,
      overdue: 0,
      formatted: `₦${Number(receivablesTotal).toLocaleString()}`,
      label: 'Debtors Owed',
    },
    payables: {
      total: payablesTotal,
      overdue: 0,
      formatted: `₦${Number(payablesTotal).toLocaleString()}`,
      label: 'You Owe',
    },

    // Aliases for industryConfig.stats keys (production-safe, additive only)
    debtors: {
      total: receivablesTotal,
      overdue: 0,
      formatted: `₦${Number(receivablesTotal).toLocaleString()}`,
      label: 'Debtors Owed',
    },
    creditors: {
      total: payablesTotal,
      overdue: 0,
      formatted: `₦${Number(payablesTotal).toLocaleString()}`,
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
      month: 0,
      growth: 0,
      label: 'Sales Today',
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
      source: 'daily+analytics+risk+repos',
      version: '1.3.0',
    },
  };
}

module.exports = router;