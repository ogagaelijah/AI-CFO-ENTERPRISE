// src/interfaces/telegram/handlers/recommendationHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const GetRecommendationsUseCase = require('../../../application/useCases/reports/GetRecommendationsUseCase');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();

const recommendationsUseCase = new GetRecommendationsUseCase({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
});

async function recommendationHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const business = await businessRepo.findByUserId(user.id);
        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        await generateRecommendations(ctx, business.id);

    } catch (error) {
        logger.error('Recommendation handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function generateRecommendations(ctx, businessId) {
    try {
        await ctx.reply('🧠 Analyzing your business data for recommendations...');

        const result = await recommendationsUseCase.execute({ businessId });

        if (!result.success || result.totalRecommendations === 0) {
            await ctx.reply(
                `✅ **All Good!**

Your business is performing well with no critical issues.

📊 **Summary:**
• ${result.summary.high} High priority issues
• ${result.summary.medium} Medium priority items
• ${result.summary.low} Low priority suggestions
• ${result.summary.info} Positive insights

Keep up the great work! 💪`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        let message = `💡 **AI-Powered Recommendations**\n\n`;
        message += `📊 ${result.totalRecommendations} recommendations found:\n\n`;

        const priorityEmojis = {
            high: '🔴',
            medium: '🟡',
            low: '🟢',
            info: 'ℹ️',
        };

        for (const rec of result.recommendations) {
            const emoji = priorityEmojis[rec.priority] || '⚪';
            message += `${emoji} **${rec.title}**\n`;
            message += `   ${rec.description}\n`;
            message += `   📌 Action: ${rec.action}\n\n`;
        }

        // Summary
        message += `📊 **Priority Summary:**\n`;
        message += `• 🔴 High: ${result.summary.high}\n`;
        message += `• 🟡 Medium: ${result.summary.medium}\n`;
        message += `• 🟢 Low: ${result.summary.low}\n`;
        message += `• ℹ️ Info: ${result.summary.info}\n`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option below:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Refresh Recommendations', callback_data: 'refresh_recommendations' }],
                    [{ text: '🔙 Back to Dashboard', callback_data: 'back_main' }],
                ],
            },
        });

    } catch (error) {
        logger.error('Generate recommendations error:', error);
        await ctx.reply(`❌ Failed to generate recommendations: ${error.message}`);
    }
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;

    if (data === 'refresh_recommendations') {
        await generateRecommendations(ctx, businessId);
        return;
    }

    if (data === 'back_main') {
        const { startHandler } = require('./startHandler');
        await startHandler(ctx);
        return;
    }
}

module.exports = {
    recommendationHandler,
    generateRecommendations,
};