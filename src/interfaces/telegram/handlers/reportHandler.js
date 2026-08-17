// src/interfaces/telegram/handlers/reportHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();

async function reportHandler(ctx) {
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

        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fetch data
        const dailySales = await saleRepo.getDailyReport(user.id, today);
        const weeklySales = await saleRepo.getWeeklyReport(user.id, weekAgo, today);
        const monthlySales = await saleRepo.getDailyReport(user.id, monthAgo);

        const totalIncome = await incomeRepo.getIncomeSummary(user.id);
        const totalExpenses = await expenseRepo.getExpenseSummary(user.id);

        // Build report message
        let message =
            `📋 **${business.name} - Financial Report**\n` +
            `🏭 ${industryName}\n` +
            `📅 ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Today's Summary
        message += `📊 **Today's Summary**\n`;
        message += `📝 ${dailySales.total_transactions || 0} sales\n`;
        message += `💰 ₦${(dailySales.total_revenue || 0).toLocaleString()}\n`;
        message += `📦 ${dailySales.total_items || 0} items sold\n\n`;

        // Weekly Trend
        message += `📈 **Weekly Sales Trend**\n`;
        if (weeklySales && weeklySales.length > 0) {
            let weekTotal = 0;
            for (const day of weeklySales) {
                weekTotal += day.revenue || 0;
                const dayDate = new Date(day.day);
                const dayName = dayDate.toLocaleDateString('en-NG', { weekday: 'short' });
                message += `   ${dayName}: ₦${(day.revenue || 0).toLocaleString()} (${day.transactions || 0})\n`;
            }
            message += `   ─────────────────────\n`;
            message += `   **Week Total: ₦${weekTotal.toLocaleString()}**\n\n`;
        } else {
            message += `   No sales in the last 7 days.\n\n`;
        }

        // Monthly Summary
        message += `📊 **Month-to-Date**\n`;
        message += `📝 ${monthlySales.total_transactions || 0} sales\n`;
        message += `💰 ₦${(monthlySales.total_revenue || 0).toLocaleString()}\n`;
        message += `📦 ${monthlySales.total_items || 0} items sold\n`;
        message += `💵 Income: ₦${(totalIncome?.total_amount || 0).toLocaleString()}\n`;
        message += `📉 Expenses: ₦${(totalExpenses?.total_amount || 0).toLocaleString()}\n`;

        const netProfit = (monthlySales.total_revenue || 0) + (totalIncome?.total_amount || 0) - (totalExpenses?.total_amount || 0);
        message += `📈 **Net Profit: ₦${netProfit.toLocaleString()}**\n\n`;

        message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `💡 Type /dashboard for real-time overview.`;

        await ctx.reply(message);

    } catch (error) {
        logger.error('Report handler error:', error);
        await ctx.reply('❌ Failed to generate report. Please try again.');
    }
}

module.exports = reportHandler;