// src/interfaces/http/routes/advisorRoutes.js
// SSOT v2.0.0-prod | Pure Decision consumer

'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

const AdvisorEngine = require('../../../application/services/advisor/AdvisorEngine');
const AdvisorDataProvider = require('../../../application/services/advisor/integration/AdvisorDataProvider');

const DecisionEngine = require('../../../application/services/decision/DecisionEngine');
const DecisionDataProvider = require('../../../application/services/decision/integration/DecisionDataProvider');

const RiskOrchestrator = require('../../../application/services/risk/RiskOrchestrator');
const RiskDataProvider = require('../../../application/services/risk/integration/RiskDataProvider');

const ForecastOrchestrator = require('../../../application/services/forecast/ForecastOrchestrator');
const ForecastDataProvider = require('../../../application/services/forecast/integration/ForecastDataProvider');
const ProjectionEngine = require('../../../application/services/forecast/core/ProjectionEngine');

const AnalyticsProvider = require('../../../application/services/analytics/integration/AnalyticsProvider');
const ReportEngineAdapter = require('../../../application/services/analytics/integration/ReportEngineAdapter');

// Report services + repos (same wiring as decisionRoutes)
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

const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const ReportRepository = require('../../../infrastructure/database/sqlite/repositories/ReportRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');

const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const incomeRepo = new IncomeRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const reportRepo = new ReportRepository();
const paymentRepo = new PaymentRepository();

const profitLossService = new ProfitLossService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, reportRepository: reportRepo,
});
const cashFlowService = new CashFlowService({
  paymentRepository: paymentRepo, saleRepository: saleRepo,
  expenseRepository: expenseRepo, incomeRepository: incomeRepo,
  debtorRepository: debtorRepo, creditorRepository: creditorRepo,
  reportRepository: reportRepo,
});
const balanceSheetService = new BalanceSheetService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const dailyReportService = new DailyReportService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const weeklyReportService = new WeeklyReportService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const monthlyReportService = new MonthlyReportService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const yearlyReportService = new YearlyReportService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const executiveReportService = new ExecutiveReportService({
  saleRepository: saleRepo, expenseRepository: expenseRepo,
  incomeRepository: incomeRepo, debtorRepository: debtorRepo,
  creditorRepository: creditorRepo, inventoryRepository: inventoryRepo,
  reportRepository: reportRepo,
});
const agingService = new AgingService({
  debtorRepository: debtorRepo, creditorRepository: creditorRepo,
  saleRepository: saleRepo, purchaseRepository: purchaseRepo,
});
const inventoryReportService = new InventoryReportService({
  inventoryRepository: inventoryRepo, saleRepository: saleRepo,
  purchaseRepository: purchaseRepo, reportRepository: reportRepo,
});

const reportEngineAdapter = new ReportEngineAdapter({
  profitLossService, cashFlowService, balanceSheetService,
  dailyReportService, weeklyReportService, monthlyReportService,
  yearlyReportService, executiveReportService, agingService,
  inventoryReportService,
});

const analyticsProvider = new AnalyticsProvider({ reportEngineAdapter });
const forecastDataProvider = new ForecastDataProvider({ analyticsProvider });
const forecastOrchestrator = new ForecastOrchestrator({
  forecastDataProvider,
  projectionEngine: new ProjectionEngine(),
});
const riskDataProvider = new RiskDataProvider({ forecastProvider: forecastOrchestrator });
const riskOrchestrator = new RiskOrchestrator({ riskDataProvider });
const decisionDataProvider = new DecisionDataProvider({ riskProvider: riskOrchestrator });
const decisionEngine = new DecisionEngine({ decisionDataProvider });

const advisorDataProvider = new AdvisorDataProvider({ decisionProvider: decisionEngine });
const advisorEngine = new AdvisorEngine({ advisorDataProvider });

router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const businessId = req.user.businessId || req.body.businessId;
    const { horizon = '30D', whatIfChanges = null } = req.body;

    if (!userId || !businessId) {
      return res.status(400).json({ success: false, message: 'userId and businessId are required' });
    }

    const result = await advisorEngine.generate({
      userId, businessId, horizon,
      whatIfChanges: Array.isArray(whatIfChanges) ? whatIfChanges : null,
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.message || result.reason || 'Advisor generation failed',
        data: result,
      });
    }

    res.json({ success: true, data: result, horizon, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error generating advisor:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate advisor insights',
    });
  }
});

router.get('/horizons', (req, res) => {
  res.json({
    success: true,
    data: { '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365 },
    labels: {
      '7D': '7 Days', '14D': '14 Days', '30D': '30 Days',
      '60D': '60 Days', '90D': '90 Days', '6M': '6 Months', '12M': '12 Months',
    },
  });
});

router.post('/health-check', (req, res) => {
  res.json({
    success: true,
    message: 'Advisor service is running',
    architecture: {
      engine: 'AdvisorEngine',
      dataProvider: 'AdvisorDataProvider',
      source: 'DecisionEngine',
      version: AdvisorEngine.VERSION,
    },
  });
});

module.exports = router;