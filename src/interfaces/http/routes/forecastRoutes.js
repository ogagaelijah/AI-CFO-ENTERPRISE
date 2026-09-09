// src/interfaces/http/routes/forecastRoutes.js
// SSOT v5.6.1-prod | Pure Analytics consumer · Zero base calculation · Production-ready

'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// ===== Forecast Core =====
const ForecastOrchestrator = require('../../../application/services/forecast/ForecastOrchestrator');
const ForecastDataProvider = require('../../../application/services/forecast/integration/ForecastDataProvider');
const ProjectionEngine = require('../../../application/services/forecast/core/ProjectionEngine');

// ===== Analytics (already exists) =====
const AnalyticsProvider = require('../../../application/services/analytics/integration/AnalyticsProvider');
const ReportEngineAdapter = require('../../../application/services/analytics/integration/ReportEngineAdapter');

// ===== Report Services (needed by Analytics) =====
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

// ===== Repositories (needed by Report Services) =====
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

// ===== Report Engine Adapter (same one Analytics uses) =====
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

// ===== Forecast Data Provider (pure SSOT bridge) =====
const forecastDataProvider = new ForecastDataProvider({
  analyticsProvider,
});

// ===== Forecast Orchestrator (pure consumer + thin projection) =====
const forecastOrchestrator = new ForecastOrchestrator({
  forecastDataProvider,
  projectionEngine: new ProjectionEngine(),
});

// Apply auth
router.use(authMiddleware);

// =============================================
// POST /api/forecast/generate
// =============================================
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { horizon = '30D', whatIfChanges = null } = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'userId and businessId are required',
      });
    }

    const validHorizons = Object.keys(ForecastOrchestrator.LIMITS.HORIZON_DAYS);
    if (!validHorizons.includes(horizon)) {
      return res.status(400).json({
        success: false,
        message: `Invalid horizon. Allowed: ${validHorizons.join(', ')}`,
      });
    }

    console.log(
      `📈 [POST /api/forecast/generate] userId=${userId} businessId=${businessId} horizon=${horizon}`
    );

    const result = await forecastOrchestrator.generate({
      userId,
      businessId,
      horizon,
      whatIfChanges: Array.isArray(whatIfChanges) ? whatIfChanges : null,
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.message || result.error,
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
      horizon,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error generating forecast:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate forecast',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// =============================================
// POST /api/forecast/what-if
// =============================================
router.post('/what-if', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { horizon = '30D', changes = [] } = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'userId and businessId are required',
      });
    }

    const result = await forecastOrchestrator.generate({
      userId,
      businessId,
      horizon,
      whatIfChanges: Array.isArray(changes) ? changes : [],
    });

    res.json({
      success: true,
      data: result.whatIf || result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error running what-if:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'What-If analysis failed',
    });
  }
});

// =============================================
// GET /api/forecast/horizons
// =============================================
router.get('/horizons', (req, res) => {
  res.json({
    success: true,
    data: ForecastOrchestrator.LIMITS.HORIZON_DAYS,
    labels: ForecastOrchestrator.LIMITS.LABELS,
  });
});

// =============================================
// POST /api/forecast/health-check
// =============================================
router.post('/health-check', (req, res) => {
  res.json({
    success: true,
    message: 'Forecast service is running',
    timestamp: new Date().toISOString(),
    architecture: {
      orchestrator: 'ForecastOrchestrator',
      dataProvider: 'ForecastDataProvider',
      projectionEngine: 'ProjectionEngine',
      version: ForecastOrchestrator.LIMITS.VERSION,
    },
  });
});

// =============================================
// GET /api/forecast/debug-analytics  (TEMPORARY – remove after debugging)
// =============================================
router.get('/debug-analytics', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || 1;
    const businessId = req.user?.businessId || 1;

    const analytics = await analyticsProvider.generateAnalytics({
      userId,
      businessId,
      startDate: '2026-06-11',
      endDate: '2026-09-09',
      periodType: 'monthly',
    });

    res.json({
      success: true,
      message: 'Raw Analytics response (for debugging Forecast SSOT)',
      data: analytics,
    });
  } catch (err) {
    console.error('❌ debug-analytics error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

module.exports = router;