// src/interfaces/telegram/handlers/recommendationHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const DecisionEngine = require('../../../application/services/decision/DecisionEngine');
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

const decisionEngine = new DecisionEngine({
    // DecisionEngine uses dataProviders pattern
    dataProviders: {
        // We'll pass minimal providers for now
        // The engine will fall back to safe defaults
    },
});

async function recommendationHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
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

        // ✅ Pass both businessId AND userId
        await generateRecommendations(ctx, business.id, user.id);

    } catch (error) {
        logger.error('Recommendation handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function generateRecommendations(ctx, businessId, userId) {
    try {
        await ctx.reply('🧠 Analyzing your business data for recommendations...');

        // ✅ Use DecisionEngine.generateDecisions()
        const result = await decisionEngine.generateDecisions({
            businessId: String(businessId),
            userId: String(userId),
        });

        const decisions = result.decisions || [];
        const summary = result.summary || { total: 0 };

        if (summary.total === 0 || decisions.length === 0) {
            await ctx.reply(
                `✅ **All Good!**

Your business is performing well with no critical issues.

📊 **Summary:**
• 🔴 Critical: ${summary.byPriority?.CRITICAL || 0}
• 🟠 High: ${summary.byPriority?.HIGH || 0}
• 🟡 Medium: ${summary.byPriority?.MEDIUM || 0}
• 🟢 Low: ${summary.byPriority?.LOW || 0}

Keep up the great work! 💪`
            );
            return;
        }

        let message = `💡 **AI-Powered Recommendations**\n\n`;
        message += `📊 ${summary.total} recommendations found:\n\n`;

        const priorityEmojis = {
            CRITICAL: '🔴',
            HIGH: '🟠',
            MEDIUM: '🟡',
            LOW: '🟢',
            INFO: 'ℹ️',
        };

        // Show top 10 decisions (limit for Telegram message length)
        const topDecisions = decisions.slice(0, 10);

        for (const rec of topDecisions) {
            const emoji = priorityEmojis[rec.priority] || '⚪';
            const title = rec.title || rec.type || 'Recommendation';
            const description = rec.description || rec.message || 'No description provided';
            const action = rec.action || rec.recommendedAction || 'Review and take appropriate action';

            message += `${emoji} *${title}*\n`;
            message += `   ${description}\n`;
            message += `   📌 Action: ${action}\n\n`;
        }

        if (decisions.length > 10) {
            message += `_... and ${decisions.length - 10} more recommendations_\n\n`;
        }

        // Summary
        message += `📊 **Priority Summary:**\n`;
        message += `• 🔴 Critical: ${summary.byPriority?.CRITICAL || 0}\n`;
        message += `• 🟠 High: ${summary.byPriority?.HIGH || 0}\n`;
        message += `• 🟡 Medium: ${summary.byPriority?.MEDIUM || 0}\n`;
        message += `• 🟢 Low: ${summary.byPriority?.LOW || 0}\n`;
        message += `• 📈 Average Confidence: ${summary.averageConfidence || 0}%\n`;
        if (summary.totalImpact) {
            message += `• 💰 Total Potential Impact: ₦${summary.totalImpact.toLocaleString()}\n`;
        }

        await ctx.reply(message);

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