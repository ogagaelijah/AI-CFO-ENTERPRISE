// src/interfaces/telegram/handlers/reportHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const { getReportKeyboard } = require('../keyboards/dashboardKeyboard');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const purchaseRepo = new PurchaseRepository();

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

        // Check if this is a callback from the reports submenu
        let reportType = 'daily';
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            if (data === 'report_daily') reportType = 'daily';
            else if (data === 'report_weekly') reportType = 'weekly';
            else if (data === 'report_monthly') reportType = 'monthly';
            else if (data === 'report_executive') reportType = 'executive';
            else if (data === 'report_pdf') reportType = 'pdf';
            else if (data === 'report_excel') reportType = 'excel';
        }

        // Clear session before generating report
        sessionManager.clearSession(telegramId);

        if (reportType === 'daily') {
            await generateDailyReport(ctx, user, business, industryName, today);
        } else if (reportType === 'weekly') {
            await generateWeeklyReport(ctx, user, business, industryName, weekAgo, today);
        } else if (reportType === 'monthly') {
            await generateMonthlyReport(ctx, user, business, industryName, monthAgo, today);
        } else if (reportType === 'executive') {
            await generateExecutiveReport(ctx, user, business, industryName);
        } else if (reportType === 'pdf') {
            await generatePDFReport(ctx, user, business);
        } else if (reportType === 'excel') {
            await generateExcelReport(ctx, user, business);
        } else {
            await ctx.reply('Select a report type from the menu.');
        }

        // Return to reports submenu after displaying
        const keyboard = getReportKeyboard();
        await ctx.reply(`Select an option below:`, { ...keyboard });

    } catch (error) {
        logger.error('Report handler error:', error);
        await ctx.reply('❌ Failed to generate report. Please try again.');
    }
}

// =============================================
// GENERATE DAILY REPORT
// =============================================
async function generateDailyReport(ctx, user, business, industryName, today) {
    const dailySales = await saleRepo.getDailyReport(user.id, today);
    const weeklySales = await saleRepo.getWeeklyReport(user.id, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], today);
    const monthlySales = await saleRepo.getDailyReport(user.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const totalIncome = await incomeRepo.getIncomeSummary(user.id);
    const totalExpenses = await expenseRepo.getExpenseSummary(user.id);
    const purchaseSummary = await purchaseRepo.getPurchaseSummary(user.id);

    // ✅ PROPER COGS from purchases
    const totalCOGS = purchaseSummary?.total_amount || 0;

    const totalRevenue = (monthlySales.total_revenue || 0) + (totalIncome?.total_amount || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

    const netProfit = grossProfit - (totalExpenses?.total_amount || 0);
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    let message =
        `📋 **${business.name} - Daily Report**\n` +
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

    // Month-to-Date with Gross Profit
    message += `📊 **Month-to-Date**\n`;
    message += `📝 ${monthlySales.total_transactions || 0} sales\n`;
    message += `💰 Revenue: ₦${(monthlySales.total_revenue || 0).toLocaleString()}\n`;
    message += `💵 Income: ₦${(totalIncome?.total_amount || 0).toLocaleString()}\n`;
    message += `📦 COGS: ₦${(totalCOGS || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Gross Profit: ₦${grossProfit.toLocaleString()}** (${grossMargin}%)\n`;
    message += `📉 Expenses: ₦${(totalExpenses?.total_amount || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Net Profit: ₦${netProfit.toLocaleString()}** (${netMargin}%)\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 Type /dashboard for real-time overview.`;

    await ctx.reply(message);
}

// =============================================
// GENERATE WEEKLY REPORT
// =============================================
async function generateWeeklyReport(ctx, user, business, industryName, startDate, endDate) {
    const weeklySales = await saleRepo.getWeeklyReport(user.id, startDate, endDate);
    const monthlySales = await saleRepo.getDailyReport(user.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate);
    const totalIncome = await incomeRepo.getIncomeSummary(user.id);
    const totalExpenses = await expenseRepo.getExpenseSummary(user.id);
    const purchaseSummary = await purchaseRepo.getPurchaseSummary(user.id);

    const totalCOGS = purchaseSummary?.total_amount || 0;

    let weekTotal = 0;
    let weekTransactions = 0;
    for (const day of weeklySales) {
        weekTotal += day.revenue || 0;
        weekTransactions += day.transactions || 0;
    }

    const totalRevenue = (monthlySales.total_revenue || 0) + (totalIncome?.total_amount || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
    const netProfit = grossProfit - (totalExpenses?.total_amount || 0);
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    let message =
        `📋 **${business.name} - Weekly Report**\n` +
        `🏭 ${industryName}\n` +
        `📅 ${new Date(startDate).toLocaleDateString('en-NG')} - ${new Date(endDate).toLocaleDateString('en-NG')}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📊 **Weekly Summary**\n`;
    message += `📝 ${weekTransactions} sales\n`;
    message += `💰 ₦${weekTotal.toLocaleString()}\n`;
    message += `📦 ${weeklySales.reduce((sum, d) => sum + (d.items_sold || 0), 0)} items sold\n\n`;

    message += `📈 **Daily Breakdown**\n`;
    if (weeklySales && weeklySales.length > 0) {
        for (const day of weeklySales) {
            const dayDate = new Date(day.day);
            const dayName = dayDate.toLocaleDateString('en-NG', { weekday: 'short' });
            message += `   ${dayName}: ₦${(day.revenue || 0).toLocaleString()} (${day.transactions || 0})\n`;
        }
    } else {
        message += `   No sales this week.\n`;
    }

    message += `\n📊 **Financial Summary**\n`;
    message += `💰 Revenue: ₦${totalRevenue.toLocaleString()}\n`;
    message += `📦 COGS: ₦${(totalCOGS || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Gross Profit: ₦${grossProfit.toLocaleString()}** (${grossMargin}%)\n`;
    message += `📉 Expenses: ₦${(totalExpenses?.total_amount || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Net Profit: ₦${netProfit.toLocaleString()}** (${netMargin}%)\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 Type /dashboard for real-time overview.`;

    await ctx.reply(message);
}

// =============================================
// GENERATE MONTHLY REPORT
// =============================================
async function generateMonthlyReport(ctx, user, business, industryName, startDate, endDate) {
    const monthlySales = await saleRepo.getDailyReport(user.id, startDate);
    const weeklySales = await saleRepo.getWeeklyReport(user.id, startDate, endDate);
    const totalIncome = await incomeRepo.getIncomeSummary(user.id);
    const totalExpenses = await expenseRepo.getExpenseSummary(user.id);
    const purchaseSummary = await purchaseRepo.getPurchaseSummary(user.id);

    const totalCOGS = purchaseSummary?.total_amount || 0;

    const totalRevenue = (monthlySales.total_revenue || 0) + (totalIncome?.total_amount || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
    const netProfit = grossProfit - (totalExpenses?.total_amount || 0);
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    let message =
        `📋 **${business.name} - Monthly Report**\n` +
        `🏭 ${industryName}\n` +
        `📅 ${new Date(startDate).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📊 **Monthly Summary**\n`;
    message += `📝 ${monthlySales.total_transactions || 0} sales\n`;
    message += `💰 ₦${(monthlySales.total_revenue || 0).toLocaleString()}\n`;
    message += `📦 ${monthlySales.total_items || 0} items sold\n\n`;

    message += `📈 **Weekly Breakdown**\n`;
    if (weeklySales && weeklySales.length > 0) {
        let weekNumber = 1;
        for (let i = 0; i < weeklySales.length; i += 7) {
            const week = weeklySales.slice(i, i + 7);
            const weekTotal = week.reduce((sum, d) => sum + (d.revenue || 0), 0);
            const weekTransactions = week.reduce((sum, d) => sum + (d.transactions || 0), 0);
            message += `   Week ${weekNumber}: ₦${weekTotal.toLocaleString()} (${weekTransactions})\n`;
            weekNumber++;
        }
    } else {
        message += `   No sales this month.\n`;
    }

    message += `\n📊 **Financial Summary**\n`;
    message += `💰 Revenue: ₦${totalRevenue.toLocaleString()}\n`;
    message += `📦 COGS: ₦${(totalCOGS || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Gross Profit: ₦${grossProfit.toLocaleString()}** (${grossMargin}%)\n`;
    message += `📉 Expenses: ₦${(totalExpenses?.total_amount || 0).toLocaleString()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 **Net Profit: ₦${netProfit.toLocaleString()}** (${netMargin}%)\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 Type /dashboard for real-time overview.`;

    await ctx.reply(message);
}

// =============================================
// GENERATE EXECUTIVE REPORT (Coming Soon)
// =============================================
async function generateExecutiveReport(ctx, user, business, industryName) {
    await ctx.reply('📋 **Executive Summary**\n\nComing soon in Phase 3!');
}

// =============================================
// GENERATE PDF (Coming Soon)
// =============================================
async function generatePDFReport(ctx, user, business) {
    await ctx.reply('📄 **PDF Export**\n\nComing soon in Phase 3!');
}

// =============================================
// GENERATE EXCEL (Coming Soon)
// =============================================
async function generateExcelReport(ctx, user, business) {
    await ctx.reply('📊 **Excel Export**\n\nComing soon in Phase 3!');
}

module.exports = reportHandler;