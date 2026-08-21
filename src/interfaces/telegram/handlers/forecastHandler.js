// src/interfaces/telegram/handlers/forecastHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const GetForecastUseCase = require('../../../application/useCases/reports/GetForecastUseCase');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const { getMainMenuKeyboard, getBackKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();

const forecastUseCase = new GetForecastUseCase({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
});

async function forecastHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;

        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        // Handle callback queries
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            await ctx.answerCbQuery();

            if (data === 'forecast_3' || data === 'forecast_6' || data === 'forecast_12') {
                const months = { forecast_3: 3, forecast_6: 6, forecast_12: 12 };
                await generateForecastReport(ctx, business.id, user.id, months[data]);
                return;
            }

            if (data === 'forecast_seasonality') {
                await generateSeasonalityReport(ctx, business.id, user.id);
                return;
            }

            if (data === 'forecast_again') {
                await showForecastMenu(ctx, business.id);
                return;
            }

            if (data === 'back_reports') {
                const { reportHandler } = require('./reportHandler');
                await reportHandler(ctx);
                return;
            }
        }

        // If no callback, show menu
        await showForecastMenu(ctx, business.id);

    } catch (error) {
        logger.error('Forecast handler error:', error);
        console.error('Forecast handler error details:', error.message, error.stack);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showForecastMenu(ctx, businessId) {
    sessionManager.setState(ctx.from.id, 'FORECAST_MENU');

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📈 3-Month Forecast', callback_data: 'forecast_3' }],
                [{ text: '📈 6-Month Forecast', callback_data: 'forecast_6' }],
                [{ text: '📈 12-Month Forecast', callback_data: 'forecast_12' }],
                [{ text: '📊 Seasonality Analysis', callback_data: 'forecast_seasonality' }],
                [{ text: '🔙 Back to Reports', callback_data: 'back_reports' }],
            ],
        },
    };

    await ctx.reply(
        `📈 **Forecasting & Predictive Insights**

Get AI-powered predictions about your business future.

• **3-Month Forecast** — Short-term predictions
• **6-Month Forecast** — Medium-term trends
• **12-Month Forecast** — Annual projections
• **Seasonality Analysis** — Monthly patterns

Select an option below:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function generateForecastReport(ctx, businessId, userId, months) {
    try {
        await ctx.reply(`⏳ Generating ${months}-month forecast...`);

        const result = await forecastUseCase.execute({
            businessId,
            userId,
            months,
            lookbackMonths: 12,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.error || 'Could not generate forecast. Please ensure you have enough historical data.'}`);
            return;
        }

        let message = `📈 *${months}-Month Forecast*\n\n`;
        message += `📊 Based on last ${result.summary.lookbackMonths} months of data\n\n`;
        message += `💰 *Average Monthly Revenue:* ₦${result.summary.averageMonthlyRevenue.toLocaleString()}\n`;
        message += `📉 *Average Monthly Costs:* ₦${result.summary.averageMonthlyCosts.toLocaleString()}\n`;
        message += `📈 *Average Monthly Profit:* ₦${result.summary.averageMonthlyProfit.toLocaleString()}\n`;
        message += `📊 *Revenue Trend:* ${result.summary.revenueTrend}\n\n`;
        message += `*Projected Totals:*\n`;
        message += `• Revenue: ₦${result.summary.totalProjectedRevenue.toLocaleString()}\n`;
        message += `• Profit: ₦${result.summary.totalProjectedProfit.toLocaleString()}\n\n`;

        message += `*Monthly Breakdown:*\n`;
        for (const forecast of result.forecast) {
            const confidenceEmoji = forecast.confidence === 'high' ? '🟢' : forecast.confidence === 'medium' ? '🟡' : '🔴';
            message += `• ${forecast.month}: ₦${forecast.projectedRevenue.toLocaleString()} ${confidenceEmoji}\n`;
        }

        await ctx.reply(message);

        // Show seasonality if available
        if (result.seasonality && result.seasonality.length > 0) {
            let seasonalityMessage = `📊 *Seasonality Patterns*\n\n`;
            for (const s of result.seasonality) {
                seasonalityMessage += `• ${s.month}: ₦${s.averageRevenue.toLocaleString()}\n`;
            }
            await ctx.reply(seasonalityMessage);
        }

        await ctx.reply('Select an option below:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 New Forecast', callback_data: 'forecast_again' }],
                    [{ text: '🔙 Back to Reports', callback_data: 'back_reports' }],
                ],
            },
        });

    } catch (error) {
        logger.error('Generate forecast error:', error);
        console.error('Generate forecast error details:', error.message, error.stack);
        await ctx.reply(`❌ Failed to generate forecast: ${error.message}`);
    }
}

async function generateSeasonalityReport(ctx, businessId, userId) {
    try {
        await ctx.reply('⏳ Analyzing seasonal patterns...');

        const result = await forecastUseCase.execute({
            businessId,
            userId,
            months: 3,
            lookbackMonths: 12,
        });

        if (!result.seasonality || result.seasonality.length === 0) {
            await ctx.reply('❌ Not enough data for seasonality analysis.');
            return;
        }

        let message = `📊 *Seasonality Analysis*\n\n`;
        message += `Monthly revenue patterns over the last year:\n\n`;

        // Find best and worst months
        const sorted = [...result.seasonality].sort((a, b) => b.averageRevenue - a.averageRevenue);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        for (const s of result.seasonality) {
            const isBest = s.month === best.month ? '🏆 ' : '';
            const isWorst = s.month === worst.month ? '📉 ' : '';
            message += `${isBest}${isWorst}• ${s.month}: ₦${s.averageRevenue.toLocaleString()}\n`;
        }

        message += `\n*Insights:*\n`;
        message += `• Best month: ${best.month} (₦${best.averageRevenue.toLocaleString()})\n`;
        message += `• Worst month: ${worst.month} (₦${worst.averageRevenue.toLocaleString()})\n`;
        const diff = ((best.averageRevenue - worst.averageRevenue) / worst.averageRevenue * 100);
        message += `• ${best.month} is ${diff.toFixed(0)}% higher than ${worst.month}\n`;

        await ctx.reply(message);

        await ctx.reply('Select an option below:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Refresh Analysis', callback_data: 'forecast_seasonality' }],
                    [{ text: '🔙 Back to Forecast', callback_data: 'forecast_again' }],
                ],
            },
        });

    } catch (error) {
        logger.error('Seasonality analysis error:', error);
        console.error('Seasonality analysis error details:', error.message, error.stack);
        await ctx.reply(`❌ Failed to analyze seasonality: ${error.message}`);
    }
}

module.exports = {
    forecastHandler,
    showForecastMenu,
    generateForecastReport,
    generateSeasonalityReport,
};