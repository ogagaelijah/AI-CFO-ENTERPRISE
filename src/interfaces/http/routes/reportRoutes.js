// src/interfaces/http/routes/reportRoutes.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// Repositories
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');

// Report Services
const ProfitLossService = require('../../../application/services/reports/ProfitLossService');
const DailyReportService = require('../../../application/services/reports/DailyReportService');
const WeeklyReportService = require('../../../application/services/reports/WeeklyReportService');
const MonthlyReportService = require('../../../application/services/reports/MonthlyReportService');
const YearlyReportService = require('../../../application/services/reports/YearlyReportService');
const ExecutiveReportService = require('../../../application/services/reports/ExecutiveReportService');
const CashFlowService = require('../../../application/services/reports/CashFlowService');
const BalanceSheetService = require('../../../application/services/reports/BalanceSheetService');

// Initialize repositories
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const purchaseRepo = new PurchaseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const paymentRepo = new PaymentRepository();

// Initialize services
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
});

const weeklyReportService = new WeeklyReportService({
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
});

const monthlyReportService = new MonthlyReportService({
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
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
    profitLossService: profitLossService,
});

const executiveReportService = new ExecutiveReportService({
    profitLossService: profitLossService,
    inventoryRepository: inventoryRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    saleRepository: saleRepo,
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

// =============================================
// GET /api/reports/pl - Full P&L Report
// =============================================
router.get('/pl', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate, period = 'monthly' } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
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
            userId,
            businessId,
            startDate: start,
            endDate: end,
            period,
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating P&L report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate P&L report',
        });
    }
});

// =============================================
// GET /api/reports/pl/summary - Quick P&L Summary
// =============================================
router.get('/pl/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
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
            userId,
            businessId,
            startDate: start,
            endDate: end,
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating P&L summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate P&L summary',
        });
    }
});

// =============================================
// GET /api/reports/daily - Daily Report
// =============================================
router.get('/daily', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await dailyReportService.generate({
            userId,
            businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating daily report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate daily report',
        });
    }
});

// =============================================
// GET /api/reports/weekly - Weekly Report
// =============================================
router.get('/weekly', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await weeklyReportService.generate({
            userId,
            businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating weekly report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate weekly report',
        });
    }
});

// =============================================
// GET /api/reports/monthly - Monthly Report
// =============================================
router.get('/monthly', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await monthlyReportService.generate({
            userId,
            businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating monthly report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate monthly report',
        });
    }
});

// =============================================
// GET /api/reports/yearly - Yearly Report
// =============================================
router.get('/yearly', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { date } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await yearlyReportService.generate({
            userId,
            businessId,
            date: date || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating yearly report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate yearly report',
        });
    }
});

// =============================================
// GET /api/reports/executive - Executive Report
// =============================================
router.get('/executive', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
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
            userId,
            businessId,
            startDate: start,
            endDate: end,
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating executive report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate executive report',
        });
    }
});

// =============================================
// GET /api/reports/cashflow - Cash Flow Report
// =============================================
router.get('/cashflow', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
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
            userId,
            businessId,
            startDate: start,
            endDate: end,
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating cash flow report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate cash flow report',
        });
    }
});

// =============================================
// GET /api/reports/cashflow/summary - Cash Flow Summary
// =============================================
router.get('/cashflow/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
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
            userId,
            businessId,
            startDate: start,
            endDate: end,
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating cash flow summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate cash flow summary',
        });
    }
});

// =============================================
// GET /api/reports/balance-sheet - Balance Sheet
// =============================================
router.get('/balance-sheet', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { asAtDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await balanceSheetService.generate({
            userId,
            businessId,
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating balance sheet:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate balance sheet',
        });
    }
});

// =============================================
// GET /api/reports/balance-sheet/summary - Balance Sheet Summary
// =============================================
router.get('/balance-sheet/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.query.businessId;
        const { asAtDate } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await balanceSheetService.generateSummary({
            userId,
            businessId,
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
        });

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('❌ Error generating balance sheet summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate balance sheet summary',
        });
    }
});

module.exports = router;