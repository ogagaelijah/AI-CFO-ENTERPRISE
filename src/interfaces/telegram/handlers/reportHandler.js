// src/interfaces/telegram/handlers/reportHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { getMainMenuKeyboard, getReportKeyboard } = require('../keyboards/dashboardKeyboard');
const { 
    formatDailyReport, 
    formatWeeklyReport,
    formatMonthlyReport,
    formatYearlyReport,
    formatExecutiveSummary,
} = require('../formatters/reportFormatter');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

/**
 * Main report handler - dispatches to specific report types
 */
async function reportHandler(ctx, reportService) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        // Get user's business for industry
        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;

        // Determine report type from command
        const command = ctx.match?.[0] || ctx.message?.text || '';
        let reportType = 'daily';

        if (command.includes('/daily') || command.includes('daily')) reportType = 'daily';
        else if (command.includes('/weekly') || command.includes('weekly')) reportType = 'weekly';
        else if (command.includes('/monthly') || command.includes('monthly')) reportType = 'monthly';
        else if (command.includes('/yearly') || command.includes('yearly')) reportType = 'yearly';
        else if (command.includes('/executive') || command.includes('executive')) reportType = 'executive';

        // Generate the report
        const now = new Date();
        let report;
        let formattedMessage;

        switch (reportType) {
            case 'daily':
                report = await reportService.generateDailyReport(user.id, now);
                formattedMessage = formatDailyReport(report);
                break;
            case 'weekly':
                report = await reportService.generateWeeklyReport(user.id, now);
                formattedMessage = formatWeeklyReport(report);
                break;
            case 'monthly':
                report = await reportService.generateMonthlyReport(user.id, now);
                formattedMessage = formatMonthlyReport(report);
                break;
            case 'yearly':
                report = await reportService.generateYearlyReport(user.id, now);
                formattedMessage = formatYearlyReport(report);
                break;
            case 'executive':
                report = await reportService.generateReport(user.id, new Date(now.getFullYear(), now.getMonth(), 1), now, { includeInventory: true });
                formattedMessage = formatExecutiveSummary(report);
                break;
            default:
                report = await reportService.generateDailyReport(user.id, now);
                formattedMessage = formatDailyReport(report);
        }

        // Send the report (plain text)
        await ctx.reply(formattedMessage);

        // Remove the reply keyboard (the extra keyboard at the bottom)
        await ctx.reply('📋 Select another report:', {
            reply_markup: {
                remove_keyboard: true
            }
        });

        // Then show the inline keyboard
        await ctx.reply('📋 Select another report:', { ...getReportKeyboard() });

    } catch (error) {
        console.error('❌ Report handler error:', error);
        await ctx.reply('❌ Failed to generate report. Please try again later.');
    }
}

/**
 * Handle report button callbacks
 */
async function reportCallbackHandler(ctx, reportService) {
    try {
        const data = ctx.callbackQuery.data;
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.answerCbQuery('Please register first');
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        await ctx.answerCbQuery('Generating report...');

        const now = new Date();
        let report;
        let formattedMessage;
        let reportType = data.replace('report_', '');

        switch (reportType) {
            case 'daily':
                report = await reportService.generateDailyReport(user.id, now);
                formattedMessage = formatDailyReport(report);
                break;
            case 'weekly':
                report = await reportService.generateWeeklyReport(user.id, now);
                formattedMessage = formatWeeklyReport(report);
                break;
            case 'monthly':
                report = await reportService.generateMonthlyReport(user.id, now);
                formattedMessage = formatMonthlyReport(report);
                break;
            case 'yearly':
                report = await reportService.generateYearlyReport(user.id, now);
                formattedMessage = formatYearlyReport(report);
                break;
            case 'executive':
                report = await reportService.generateReport(user.id, new Date(now.getFullYear(), now.getMonth(), 1), now, { includeInventory: true });
                formattedMessage = formatExecutiveSummary(report);
                break;
            default:
                report = await reportService.generateDailyReport(user.id, now);
                formattedMessage = formatDailyReport(report);
        }

        // Edit the original message with the report
        await ctx.editMessageText(formattedMessage);

        // Remove the reply keyboard (the extra keyboard at the bottom)
        await ctx.reply('📋 Select another report:', {
            reply_markup: {
                remove_keyboard: true
            }
        });

        // Then show the inline keyboard
        await ctx.reply('📋 Select another report:', { ...getReportKeyboard() });

    } catch (error) {
        console.error('❌ Report callback error:', error);
        await ctx.answerCbQuery('Failed to generate report');
        await ctx.reply('❌ Failed to generate report. Please try again later.');
    }
}

module.exports = {
    reportHandler,
    reportCallbackHandler,
};