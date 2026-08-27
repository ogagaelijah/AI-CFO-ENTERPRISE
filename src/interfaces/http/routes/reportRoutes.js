// src/interfaces/http/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const ReportService = require('../../../application/services/reportService');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repositories
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const purchaseRepo = new PurchaseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const customerRepo = new CustomerRepository();

// Initialize Report Service with all repositories in an object
const reportService = new ReportService({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    expenseRepository: expenseRepo,
    purchaseRepository: purchaseRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    customerRepository: customerRepo,
});

// All report routes require authentication
router.use(authMiddleware);

// Get Daily Report
router.get('/daily', async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await reportService.generateDailyReport(userId, date);
        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Daily report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate daily report',
        });
    }
});

// Get Weekly Report
router.get('/weekly', async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await reportService.generateWeeklyReport(userId, date);
        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Weekly report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate weekly report',
        });
    }
});

// Get Monthly Report
router.get('/monthly', async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await reportService.generateMonthlyReport(userId, date);
        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Monthly report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate monthly report',
        });
    }
});

// Get Yearly Report
router.get('/yearly', async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await reportService.generateYearlyReport(userId, date);
        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Yearly report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate yearly report',
        });
    }
});

// Get Executive Summary
router.get('/executive', async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const report = await reportService.generateExecutiveSummary(userId, date);
        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Executive summary error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate executive summary',
        });
    }
});

module.exports = router;