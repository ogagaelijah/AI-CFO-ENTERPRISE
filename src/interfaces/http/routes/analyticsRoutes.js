// src/interfaces/http/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// ===== Core Analytics Provider =====
const AnalyticsProvider = require('../../../application/services/analytics/integration/AnalyticsProvider');
const ReportEngineAdapter = require('../../../application/services/analytics/integration/ReportEngineAdapter');

// ===== Report Services (SSOT - Read from Report Engine) =====
const ProfitLossService = require('../../../application/services/reports/ProfitLossService');
const CashFlowService = require('../../../application/services/reports/CashFlowService');
const BalanceSheetService = require('../../../application/services/reports/BalanceSheetService');
const DailyReportService = require('../../../application/services/reports/DailyReportService');
const WeeklyReportService = require('../../../application/services/reports/WeeklyReportService');
const MonthlyReportService = require('../../../application/services/reports/MonthlyReportService');
const YearlyReportService = require('../../../application/services/reports/YearlyReportService');
const ExecutiveReportService = require('../../../application/services/reports/ExecutiveReportService');
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
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const ReportRepository = require('../../../infrastructure/database/sqlite/repositories/ReportRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository'); // ← ADDED

// ===== Initialize Repositories =====
const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const incomeRepo = new IncomeRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const customerRepo = new CustomerRepository();
const supplierRepo = new SupplierRepository();
const reportRepo = new ReportRepository();
const paymentRepo = new PaymentRepository(); // ← ADDED

// ===== Initialize Report Services (SSOT) =====
const profitLossService = new ProfitLossService({
  saleRepository: saleRepo,
  expenseRepository: expenseRepo,
  incomeRepository: incomeRepo,
  reportRepository: reportRepo,
});

const cashFlowService = new CashFlowService({
  paymentRepository: paymentRepo,          // ← ADDED (this was the missing piece)
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

// ===== Initialize Report Engine Adapter =====
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

// ===== Initialize Analytics Provider =====
const analyticsProvider = new AnalyticsProvider({
  reportEngineAdapter,
});

// Apply auth to all routes
router.use(authMiddleware);

// =============================================
// POST /api/analytics/generate - Main endpoint
// =============================================
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { period = 'monthly', startDate: bodyStart, endDate: bodyEnd } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Resolve period dates
    let startDate, endDate, periodType;
    if (bodyStart && bodyEnd) {
      startDate = bodyStart;
      endDate = bodyEnd;
      periodType = period;
    } else {
      const resolved = resolvePeriod(period);
      startDate = resolved.startDate;
      endDate = resolved.endDate;
      periodType = resolved.periodType;
    }

    console.log(`📊 [POST /api/analytics/generate] userId: ${userId}, businessId: ${businessId}, period: ${periodType}`);

    const result = await analyticsProvider.generateAnalytics({
      userId,
      businessId,
      startDate,
      endDate,
      periodType,
    });

    res.json({
      success: true,
      data: result,
      period: periodType,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate analytics',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// =============================================
// POST /api/analytics/executive - Executive dashboard
// =============================================
router.post('/executive', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { period = 'monthly', startDate: bodyStart, endDate: bodyEnd } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    let startDate, endDate, periodType;
    if (bodyStart && bodyEnd) {
      startDate = bodyStart;
      endDate = bodyEnd;
      periodType = period;
    } else {
      const resolved = resolvePeriod(period);
      startDate = resolved.startDate;
      endDate = resolved.endDate;
      periodType = resolved.periodType;
    }

    console.log(`📊 [POST /api/analytics/executive] userId: ${userId}, businessId: ${businessId}`);

    const fullAnalytics = await analyticsProvider.generateAnalytics({
      userId,
      businessId,
      startDate,
      endDate,
      periodType,
    });

    // Extract executive summary from the full analytics
    const executive = fullAnalytics.executive || {};

    res.json({
      success: true,
      data: executive,
      period: periodType,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error generating executive analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate executive analytics',
    });
  }
});

// =============================================
// POST /api/analytics/health-check - Service health
// =============================================
router.post('/health-check', async (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    timestamp: new Date().toISOString(),
    architecture: {
      provider: 'AnalyticsProvider',
      adapter: 'ReportEngineAdapter',
      transformer: 'ReportAnalyticsTransformer',
    },
  });
});

// =============================================
// Helper - Resolve period dates
// =============================================
function resolvePeriod(period = 'monthly') {
  const now = new Date();
  let startDate, endDate;

  if (period === 'daily') {
    startDate = endDate = now.toISOString().split('T')[0];
  } else if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    startDate = monday.toISOString().split('T')[0];
    endDate = now.toISOString().split('T')[0];
  } else if (period === 'yearly') {
    startDate = `${now.getFullYear()}-01-01`;
    endDate = now.toISOString().split('T')[0];
  } else {
    // monthly (default)
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    endDate = now.toISOString().split('T')[0];
  }

  return { startDate, endDate, periodType: period };
}

module.exports = router;