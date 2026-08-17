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
const { getDashboardKeyboard } = require('../keyboards/dashboardKeyboard');
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

        const businesses = await businessRepo.findByUserId(user.id);
        const business = businesses.length > 0 ? businesses[0] : null;

        if (!business) {
            await ctx.reply('⚠️ No business found. Please complete registration.');
            return;
        }

        const industry = INDUSTRIES[business.industry];
        const industryName = industry ? `${industry.icon} ${industry.name}` : business.industry;

        // Get all data
        const salesSummary = await saleRepo.getSalesSummary(user.id);
        const todaySales = await saleRepo.getTodaySales(user.id);
        const inventorySummary = await inventoryRepo.getSummary(user.id);
        const debtorSummary = await debtorRepo.getSummary(user.id);
        const creditorSummary = await creditorRepo.getSummary(user.id);
        const incomeSummary = await incomeRepo.getIncomeSummary(user.id);
        const expenseSummary = await expenseRepo.getExpenseSummary(user.id);

        // Calculate trial days remaining
        const createdAt = new Date(user.createdAt);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        const today = new Date();
        const daysRemaining = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));

        // Build dashboard message
        let message =
            `📊 **${business.name} - Dashboard**\n` +
            `🏭 ${industryName}\n` +
            `📅 ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Today's Sales
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_price, 0);
        message += `💰 **Today's Sales**\n`;
        message += `📝 ${todaySales.length} transactions\n`;
        message += `💵 ₦${todayRevenue.toLocaleString()}\n\n`;

        // Total Sales
        message += `📈 **Lifetime Sales**\n`;
        message += `📦 ${salesSummary.total_sales || 0} sales\n`;
        message += `💵 ₦${(salesSummary.total_revenue || 0).toLocaleString()}\n`;
        message += `🔢 ${salesSummary.total_items_sold || 0} items sold\n\n`;

        // Income & Expenses
        message += `💰 **Income**\n`;
        message += `   ${incomeSummary.total_entries || 0} entries\n`;
        message += `   ₦${(incomeSummary.total_amount || 0).toLocaleString()}\n\n`;

        message += `📉 **Expenses**\n`;
        message += `   ${expenseSummary.total_entries || 0} entries\n`;
        message += `   ₦${(expenseSummary.total_amount || 0).toLocaleString()}\n\n`;

        // Inventory Summary
        if (industry && industry.features.inventory) {
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

        const keyboard = getDashboardKeyboard(business.industry);

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

    } catch (error) {
        logger.error('Dashboard error:', error);
        await ctx.reply('❌ Failed to load dashboard. Please try again.');
    }
}

module.exports = dashboardHandler;