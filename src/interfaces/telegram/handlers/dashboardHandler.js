// src/interfaces/telegram/handlers/dashboardHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();

async function dashboardHandler(ctx) {
    try {
        const telegramId = ctx.from.id;

        const user = await userRepo.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        let businesses = await businessRepo.findByUserId(user.id);
        let business = null;
        if (Array.isArray(businesses) && businesses.length > 0) {
            business = businesses[0];
        } else if (businesses && !Array.isArray(businesses)) {
            business = businesses;
        }

        if (!business) {
            await ctx.reply('⚠️ No business found. Please complete registration.');
            return;
        }

        const industry = INDUSTRIES[business.industry];
        const industryName = industry ? `${industry.icon} ${industry.name}` : business.industry;

        // ✅ Get all data using existing methods
        const sales = await saleRepo.findByUserId(user.id);
        const incomes = await incomeRepo.findByUserId(user.id);
        const expenses = await expenseRepo.findByUserId(user.id);
        const inventorySummary = await inventoryRepo.getSummary(user.id);
        const debtorSummary = await debtorRepo.getSummary(user.id);
        const creditorSummary = await creditorRepo.getSummary(user.id);

        // ✅ Calculate sales summary
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);
        const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

        // ✅ Calculate today's sales
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.sale_date && s.sale_date.split('T')[0] === today);
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_price, 0);

        // ✅ Calculate income summary
        const totalIncomeEntries = incomes.length;
        const totalIncomeAmount = incomes.reduce((sum, i) => sum + i.amount, 0);

        // ✅ Calculate expense summary
        const totalExpenseEntries = expenses.length;
        const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

        // ✅ Calculate trial days remaining
        const createdAt = new Date(user.createdAt);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        const todayDate = new Date();
        const daysRemaining = Math.ceil((trialEndDate - todayDate) / (1000 * 60 * 60 * 24));

        // ✅ Build dashboard message
        let message =
            `📊 **${business.name} - Dashboard**\n` +
            `🏭 ${industryName}\n` +
            `📅 ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Today's Sales
        message += `💰 **Today's Sales**\n`;
        message += `📝 ${todaySales.length} transactions\n`;
        message += `💵 ₦${todayRevenue.toLocaleString()}\n\n`;

        // Total Sales
        message += `📈 **Lifetime Sales**\n`;
        message += `📦 ${totalSales} sales\n`;
        message += `💵 ₦${totalRevenue.toLocaleString()}\n`;
        message += `🔢 ${totalItemsSold} items sold\n\n`;

        // Income & Expenses
        message += `💰 **Income**\n`;
        message += `   ${totalIncomeEntries} entries\n`;
        message += `   ₦${totalIncomeAmount.toLocaleString()}\n\n`;

        message += `📉 **Expenses**\n`;
        message += `   ${totalExpenseEntries} entries\n`;
        message += `   ₦${totalExpenseAmount.toLocaleString()}\n\n`;

        // Inventory Summary
        if (industry && industry.features && industry.features.inventory) {
            message += `📦 **Inventory Summary**\n`;
            message += `📦 ${inventorySummary.total_items || 0} items\n`;
            message += `📦 ${inventorySummary.total_quantity || 0} units\n`;
            message += `💰 ₦${(inventorySummary.total_selling_value || 0).toLocaleString()}\n`;
            if (inventorySummary.low_stock_count > 0) {
                message += `⚠️ ${inventorySummary.low_stock_count} items low stock\n`;
            }
            message += `\n`;
        }

        // Debtors & Creditors
        message += `👥 **Debtors**\n`;
        message += `   ${debtorSummary.total_debtors || 0} debtors\n`;
        message += `   ₦${(debtorSummary.total_outstanding || 0).toLocaleString()}\n\n`;

        message += `🏦 **Creditors**\n`;
        message += `   ${creditorSummary.total_creditors || 0} creditors\n`;
        message += `   ₦${(creditorSummary.total_outstanding || 0).toLocaleString()}\n\n`;

        // Account Status
        message += `📋 **Account Status**\n`;
        message += `─────────────────────\n`;
        if (daysRemaining > 0) {
            message += `✅ Free Trial Active\n`;
            message += `⏳ ${daysRemaining} days remaining\n`;
        } else {
            message += `⚠️ Free Trial Expired\n`;
            message += `⏳ Please upgrade to continue\n`;
        }

        message += `\n📊 **Select an option below to get started:**`;

        const keyboard = getMainMenuKeyboard(business.industry);

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

    } catch (error) {
        console.error('❌ Dashboard error:', error.message);
        console.error('❌ Stack:', error.stack);
        logger.error('Dashboard error:', {
            message: error.message,
            stack: error.stack
        });
        await ctx.reply(`❌ Failed to load dashboard: ${error.message}`);
    }
}

module.exports = dashboardHandler;