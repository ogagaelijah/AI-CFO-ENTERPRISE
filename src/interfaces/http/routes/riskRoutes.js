// src/interfaces/http/routes/riskRoutes.js
// SSOT v2.0.0-prod | Pure Forecast consumer · Zero base calculation · Production-ready

'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// ===== Risk Core =====
const RiskOrchestrator = require('../../../application/services/risk/RiskOrchestrator');
const RiskDataProvider = require('../../../application/services/risk/integration/RiskDataProvider');

// ===== Forecast (already exists – we only consume it) =====
const ForecastOrchestrator = require('../../../application/services/forecast/ForecastOrchestrator');
const ForecastDataProvider = require('../../../application/services/forecast/integration/ForecastDataProvider');
const ProjectionEngine = require('../../../application/services/forecast/core/ProjectionEngine');

// ===== Analytics (needed by Forecast) =====
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

// Apply auth
router.use(authMiddleware);

// =============================================
// POST /api/risk/assess
// =============================================
router.post('/assess', async (req, res) => {
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

    const validHorizons = ['7D', '14D', '30D', '60D', '90D', '6M', '12M'];
    if (!validHorizons.includes(horizon)) {
      return res.status(400).json({
        success: false,
        message: `Invalid horizon. Allowed: ${validHorizons.join(', ')}`,
      });
    }

    console.log(
      `🛡️ [POST /api/risk/assess] userId=${userId} businessId=${businessId} horizon=${horizon}`
    );

    const result = await riskOrchestrator.assess({
      userId,
      businessId,
      horizon,
      whatIfChanges: Array.isArray(whatIfChanges) ? whatIfChanges : null,
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.message || result.reason || 'Risk assessment failed',
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
    console.error('❌ Error assessing risk:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assess risk',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// =============================================
// POST /api/risk/quick
// =============================================
router.post('/quick', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { horizon = '30D' } = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'userId and businessId are required',
      });
    }

    const result = await riskOrchestrator.assess({
      userId,
      businessId,
      horizon,
    });

    // Lightweight projection
    const quick = {
      overallScore: result.summary?.overallScore ?? 0,
      overallSeverity: result.summary?.overallSeverity ?? 'LOW',
      criticalCount: result.summary?.criticalRisks ?? 0,
      highCount: result.summary?.highRisks ?? 0,
      topRisk: result.executiveSummary?.topRisk || null,
      summary: result.executiveSummary?.summary || '',
    };

    res.json({
      success: true,
      data: quick,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in quick risk:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Quick risk assessment failed',
    });
  }
});

// =============================================
// GET /api/risk/horizons
// =============================================
router.get('/horizons', (req, res) => {
  res.json({
    success: true,
    data: {
      '7D': 7,
      '14D': 14,
      '30D': 30,
      '60D': 60,
      '90D': 90,
      '6M': 180,
      '12M': 365,
    },
    labels: {
      '7D': '7 Days',
      '14D': '14 Days',
      '30D': '30 Days',
      '60D': '60 Days',
      '90D': '90 Days',
      '6M': '6 Months',
      '12M': '12 Months',
    },
  });
});

// =============================================
// POST /api/risk/health-check
// =============================================
router.post('/health-check', (req, res) => {
  res.json({
    success: true,
    message: 'Risk service is running',
    timestamp: new Date().toISOString(),
    architecture: {
      orchestrator: 'RiskOrchestrator',
      dataProvider: 'RiskDataProvider',
      source: 'ForecastOrchestrator',
      version: RiskOrchestrator.VERSION,
    },
  });
});

module.exports = router;