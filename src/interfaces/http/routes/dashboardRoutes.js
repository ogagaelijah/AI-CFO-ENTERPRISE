// src/interfaces/http/routes/dashboardRoutes.js
// Aggregated dashboard endpoint — SSOT consumer
// v2.9.2-prod — Normalizes lowStockItems (item_name vs name) so web+mobile render identically.

'use strict';

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

// ===== Risk Core =====
const RiskOrchestrator = require('../../../application/services/risk/RiskOrchestrator');
const RiskDataProvider = require('../../../application/services/risk/integration/RiskDataProvider');

// ===== Forecast =====
const ForecastOrchestrator = require('../../../application/services/forecast/ForecastOrchestrator');
const ForecastDataProvider = require('../../../application/services/forecast/integration/ForecastDataProvider');
const ProjectionEngine = require('../../../application/services/forecast/core/ProjectionEngine');

// ===== Analytics =====
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

const analyticsProvider = new AnalyticsProvider({
  reportEngineAdapter,
});

const forecastDataProvider = new ForecastDataProvider({
  analyticsProvider,
});

const forecastOrchestrator = new ForecastOrchestrator({
  forecastDataProvider,
  projectionEngine: new ProjectionEngine(),
});

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

// ★ Canonical normalizer — makes both sources emit the same shape.
function normalizeLowStockItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      if (!item) return null;
      const itemName = item.item_name ?? item.name ?? null;
      if (!itemName) return null;
      return {
        id: item.id ?? null,
        item_name: itemName,
        name: itemName,
        quantity: Number(item.quantity) || 0,
        reorder_level: Number(item.reorder_level ?? item.reorderLevel) || 5,
        base_unit: item.base_unit ?? item.baseUnit ?? 'units',
      };
    })
    .filter(Boolean);
}

router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const businessId = req.user.businessId;
    const role = req.user.role;

    if (!userId || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // v13: normalize lowStockItems shape — discard v12 cache
    const cacheKey = `aicfo:dashboard:${businessId}:daily:v13`;

    const data = await cacheService.getOrSet(
      cacheKey,
      () => fetchDashboardData({ userId, businessId, role }),
      DASHBOARD_CACHE_TTL_MS
    );

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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

router.post('/health-check', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    message: 'Dashboard service is running',
    cacheStats: stats,
    timestamp: new Date().toISOString(),
  });
});

async function fetchDashboardData({ userId, businessId, role }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const dailyKey = `aicfo:daily:${businessId}:${todayStr}`;
  const cashFlowKey = `aicfo:cashflow:${businessId}:${todayStr}`;
  const riskKey = `aicfo:risk:${businessId}`;

  const [
    daily,
    inventorySummaryData,
    debtorsTotalRaw,
    creditorsTotalRaw,
    cashFlowTodayRaw,
  ] = await Promise.all([
    cacheService.getOrSet(
      dailyKey,
      () => dailyReportService.generate({ userId, businessId, date: todayStr }),
      DAILY_CACHE_TTL_MS
    ),
    inventoryRepo.getSummary(businessId),
    debtorRepo.getTotalOutstanding(businessId),
    creditorRepo.getTotalOutstanding(businessId),
    paymentRepo.getCashFlowForDate(businessId, todayStr),
  ]);

  const [analytics, risk, cashFlow, activeProjectsRaw, todayInvoicesRaw, studentsActiveRaw] =
    await Promise.all([
      analyticsProvider.generateAnalytics({
        userId,
        businessId,
        startDate: startDateStr,
        endDate: todayStr,
        periodType: 'monthly',
      }).catch((e) => {
        console.warn('⚠️ [Dashboard] analytics degraded:', e.message);
        return null;
      }),

      cacheService.getOrSet(
        riskKey,
        () => riskOrchestrator.assess({ userId, businessId, data: {} }),
        RISK_CACHE_TTL_MS
      ).catch((e) => {
        console.warn('⚠️ [Dashboard] risk degraded:', e.message);
        return null;
      }),

      cacheService.getOrSet(
        cashFlowKey,
        () => cashFlowService.generate({
          userId,
          businessId,
          startDate: '2000-01-01',
          endDate: todayStr,
        }),
        CASHFLOW_CACHE_TTL_MS
      ).catch((e) => {
        console.warn('⚠️ [Dashboard] cashFlow degraded:', e.message);
        return null;
      }),

      projectRepo.countByBusinessId(businessId, { status: 'ACTIVE' }).catch(() => 0),
      invoiceRepo.countByBusinessId(businessId, { fromDate: todayStr, toDate: todayStr }).catch(() => 0),
      studentRepo.countActive(businessId).catch(() => 0),
    ]);

  const debtorsTotal = Number(debtorsTotalRaw) || 0;
  const creditorsTotal = Number(creditorsTotalRaw) || 0;
  const inventorySummary = inventorySummaryData || {};
  const activeProjects = Number(activeProjectsRaw) || 0;
  const todayInvoices = Number(todayInvoicesRaw) || 0;
  const cashFlowToday = cashFlowTodayRaw || { cashIn: 0, cashOut: 0 };
  const studentsActive = Number(studentsActiveRaw) || 0;

  const snapshot = analytics?.snapshot || {};
  const reportData = analytics?.reportData || {};
  const report = reportData?.report || {};
  const monthly = report?.monthly || {};
  const metrics = reportData?.metrics || {};

  const today = daily?.today || {};

  const todayRevenue = Number(today.revenue ?? 0);
  const todaySalesCount = Number(today.salesCount ?? 0);
  const todayExpenses = Number(today.expenses ?? 0);
  const todayProfit = Number(today.netProfit ?? 0);
  const todayNetMargin = Number(today.netMargin ?? 0);

  const inventoryTotal = Number(
    inventorySummary.totalValue ?? inventorySummary.total_value ??
    inventorySummary.total_selling_value ??
    metrics.inventory ?? 0
  );

  const lowStockCount = Number(
    inventorySummary.lowStockCount ??
    inventorySummary.low_stock_count ??
    today.inventory?.lowStockCount ?? 0
  );

  // ★ Merge both sources, normalize shape. Prefer repo (has id + base_unit),
  // fall back to daily calculator. Deduplicate by name.
  const fromRepo = normalizeLowStockItems(inventorySummary.lowStockItems);
  const fromDaily = normalizeLowStockItems(today.inventory?.lowStockItems);

  const seenNames = new Set();
  const lowStockItems = [];
  for (const item of [...fromRepo, ...fromDaily]) {
    const key = item.item_name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    lowStockItems.push(item);
  }

  const cashCurrent = Number(cashFlow?.closingCash ?? cashFlow?.summary?.closingCash ?? 0);

  const healthObj = analytics?.health || snapshot?.health || {};
  const healthScore = Number(healthObj.score ?? healthObj.overallScore ?? 0);
  const healthStatus = healthObj.status || healthObj.overallStatus || 'NEUTRAL';

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
      lowStockItems,
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

  if (role === 'CASHIER') {
    kpiResponse.revenue = { today: 0, month: 0, growth: 0, formatted: '₦0', label: 'Revenue Today' };
    kpiResponse.profit = { today: 0, month: 0, margin: 0, formatted: '₦0', label: 'Profit Today' };
    kpiResponse.cash_out = { today: 0, formatted: '₦0', label: 'Cash Paid Today' };
    kpiResponse.expenses = { today: 0, month: 0, formatted: '₦0', label: 'Expenses Today' };
    kpiResponse.cash = { current: 0, flow: 0, formatted: '₦0', label: 'Cash Position' };
    kpiResponse.payables = { total: 0, overdue: 0, formatted: '₦0', label: 'You Owe' };
    kpiResponse.creditors = { total: 0, overdue: 0, formatted: '₦0', label: 'You Owe' };
  }

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
      version: '2.9.2',
    },
  };
}

module.exports = router;