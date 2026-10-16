// src/interfaces/http/routes/reportRoutes.js
// v1.1.0-prod — Every route requires OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Cashier has no access to any financial report.
// v1.0.0-prod — Initial.

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');

const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');

const ProfitLossService = require('../../../application/services/reports/ProfitLossService');
const DailyReportService = require('../../../application/services/reports/DailyReportService');
const WeeklyReportService = require('../../../application/services/reports/WeeklyReportService');
const MonthlyReportService = require('../../../application/services/reports/MonthlyReportService');
const YearlyReportService = require('../../../application/services/reports/YearlyReportService');
const ExecutiveReportService = require('../../../application/services/reports/ExecutiveReportService');
const CashFlowService = require('../../../application/services/reports/CashFlowService');
const BalanceSheetService = require('../../../application/services/reports/BalanceSheetService');

const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const purchaseRepo = new PurchaseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const paymentRepo = new PaymentRepository();

const profitLossService = new ProfitLossService({
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
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
    profitLossService: profitLossService,
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
    profitLossService: profitLossService,
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
});

const cashFlowService = new CashFlowService({
    paymentRepository: paymentRepo,
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
});

const balanceSheetService = new BalanceSheetService({
    paymentRepository: paymentRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    saleRepository: saleRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
    cashFlowService: cashFlowService,
    profitLossService: profitLossService,
});

router.use(authMiddleware);

// ★ Role gate — every report requires financial role
const FINANCIAL_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];

// =============================================
// GET /api/reports/pl
// =============================================
router.get('/pl', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate, period = 'monthly' } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        let start = startDate;
        let end = endDate;

        if (!start || !end) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }

        const result = await profitLossService.generateWithComparison({
            userId, businessId,
            startDate: start, endDate: end, period,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating P&L report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate P&L report' });
    }
});

// =============================================
// GET /api/reports/pl/summary
// =============================================
router.get('/pl/summary', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        let start = startDate;
        let end = endDate;

        if (!start || !end) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }

        const result = await profitLossService.generateSummary({
            userId, businessId, startDate: start, endDate: end,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating P&L summary:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate P&L summary' });
    }
});

// =============================================
// GET /api/reports/daily
// =============================================
router.get('/daily', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await dailyReportService.generate({
            userId, businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating daily report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate daily report' });
    }
});

// =============================================
// GET /api/reports/weekly
// =============================================
router.get('/weekly', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await weeklyReportService.generate({
            userId, businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating weekly report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate weekly report' });
    }
});

// =============================================
// GET /api/reports/monthly
// =============================================
router.get('/monthly', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await monthlyReportService.generate({
            userId, businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating monthly report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate monthly report' });
    }
});

// =============================================
// GET /api/reports/yearly
// =============================================
router.get('/yearly', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await yearlyReportService.generate({
            userId, businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating yearly report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate yearly report' });
    }
});

// =============================================
// GET /api/reports/executive
// =============================================
router.get('/executive', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        let start = startDate;
        let end = endDate;

        if (!start || !end) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }

        const result = await executiveReportService.generate({
            userId, businessId, startDate: start, endDate: end,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating executive report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate executive report' });
    }
});

// =============================================
// GET /api/reports/cashflow
// =============================================
router.get('/cashflow', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        let start = startDate;
        let end = endDate;

        if (!start || !end) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }

        const result = await cashFlowService.generate({
            userId, businessId, startDate: start, endDate: end,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating cash flow report:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate cash flow report' });
    }
});

// =============================================
// GET /api/reports/cashflow/summary
// =============================================
router.get('/cashflow/summary', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        let start = startDate;
        let end = endDate;

        if (!start || !end) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }

        const result = await cashFlowService.generateSummary({
            userId, businessId, startDate: start, endDate: end,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating cash flow summary:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate cash flow summary' });
    }
});

// =============================================
// GET /api/reports/balance-sheet
// =============================================
router.get('/balance-sheet', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { asAtDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await balanceSheetService.generate({
            userId, businessId,
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating balance sheet:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate balance sheet' });
    }
});

// =============================================
// GET /api/reports/balance-sheet/summary
// =============================================
router.get('/balance-sheet/summary', requireRole(...FINANCIAL_ROLES), async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { asAtDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await balanceSheetService.generateSummary({
            userId, businessId,
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error generating balance sheet summary:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate balance sheet summary' });
    }
});

module.exports = router;