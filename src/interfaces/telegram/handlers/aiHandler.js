// src/interfaces/telegram/handlers/aiHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const AskCFOQuestionUseCase = require('../../../application/useCases/ai/AskCFOQuestionUseCase');
const GetFinancialAdviceUseCase = require('../../../application/useCases/ai/GetFinancialAdviceUseCase');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const OpenAIService = require('../../../infrastructure/services/ai/OpenAIService');
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

const openAIService = new OpenAIService();

const askCFOUseCase = new AskCFOQuestionUseCase({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    aiService: openAIService,
});

const financialAdviceUseCase = new GetFinancialAdviceUseCase({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    aiService: openAIService,
});

async function aiHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
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

        const state = session ? session.state : null;

        if (state === 'AI_WAITING_QUESTION') {
            await handleQuestion(ctx, business.id);
            return;
        }

        await showAIMenu(ctx);

    } catch (error) {
        logger.error('AI handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showAIMenu(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'AI_MENU');

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '❓ Ask a Question', callback_data: 'ai_ask_question' }],
                [{ text: '💡 Get Financial Advice', callback_data: 'ai_advice' }],
                [{ text: '📊 Revenue Advice', callback_data: 'ai_advice_revenue' }],
                [{ text: '💰 Cost Reduction Advice', callback_data: 'ai_advice_costs' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
            ],
        },
    };

    await ctx.reply(
        `🧠 **AI Financial Assistant**

Ask me anything about your business finances, and I'll provide insights based on your actual data.

**What can I help you with?**

• ❓ **Ask a Question** — Any financial question
• 💡 **General Advice** — Overall business health
• 📊 **Revenue Advice** — Ways to increase income
• 💰 **Cost Reduction** — Save money on expenses

Type your question or select an option above.`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handleQuestion(ctx, businessId) {
    const question = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!question) {
        await ctx.reply('Please type your question.');
        return;
    }

    try {
        await ctx.reply('🤔 Thinking...');

        const result = await askCFOUseCase.execute({
            businessId,
            question,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.response || 'Failed to get response. Please try again.'}`);
            return;
        }

        let message = `💡 **Your Question:** ${result.question}\n\n`;
        message += `📋 **Response:**\n${result.response}\n\n`;

        if (result.context) {
            message += `📊 **Context:** ${result.context.period}\n`;
            message += `• Revenue: ₦${result.context.metrics.totalRevenue.toLocaleString()}\n`;
            message += `• Profit: ₦${result.context.metrics.netProfit.toLocaleString()}\n`;
            message += `• Outstanding Debt: ₦${result.context.metrics.totalOutstanding.toLocaleString()}\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        // Ask if they want to ask another question
        sessionManager.setState(telegramId, 'AI_WAITING_QUESTION');

        await ctx.reply('Ask another question or select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❓ Ask Another Question', callback_data: 'ai_ask_question' }],
                    [{ text: '🔙 Back to AI Menu', callback_data: 'ai_menu' }],
                ],
            },
        });

    } catch (error) {
        logger.error('AI question error:', error);
        await ctx.reply(`❌ Failed to process question: ${error.message}`);
    }
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;
    const telegramId = ctx.from.id;

    await ctx.answerCallbackQuery();

    switch (data) {
        case 'ai_ask_question':
            sessionManager.setState(telegramId, 'AI_WAITING_QUESTION');
            await ctx.reply(
                '❓ **Ask Your Question**\n\n' +
                'Type any question about your business finances.\n\n' +
                'Examples:\n' +
                '• "What is my most profitable product?"\n' +
                '• "How can I reduce my expenses?"\n' +
                '• "Who owes me the most money?"\n' +
                '• "What\'s my profit margin?"\n' +
                '• "When should I restock inventory?"'
            );
            break;

        case 'ai_advice':
            await generateAdvice(ctx, businessId, 'general');
            break;

        case 'ai_advice_revenue':
            await generateAdvice(ctx, businessId, 'revenue');
            break;

        case 'ai_advice_costs':
            await generateAdvice(ctx, businessId, 'costs');
            break;

        case 'ai_menu':
            await showAIMenu(ctx);
            break;

        case 'back_main':
            const { startHandler } = require('./startHandler');
            await startHandler(ctx);
            break;

        default:
            await showAIMenu(ctx);
    }
}

async function generateAdvice(ctx, businessId, topic) {
    try {
        await ctx.reply('🧠 Analyzing your business data...');

        const result = await financialAdviceUseCase.execute({
            businessId,
            topic,
        });

        if (!result.success) {
            await ctx.reply('❌ Failed to generate advice. Please try again.');
            return;
        }

        let message = `💡 **AI Financial Advice**\n\n`;
        message += `${result.advice}\n\n`;

        if (result.recommendations && result.recommendations.length > 0) {
            message += `**📌 Recommendations:**\n`;
            for (const rec of result.recommendations) {
                message += `• ${rec}\n`;
            }
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('What would you like to do next?', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Get More Advice', callback_data: `ai_advice_${topic}` }],
                    [{ text: '🔙 Back to AI Menu', callback_data: 'ai_menu' }],
                ],
            },
        });

    } catch (error) {
        logger.error('Generate advice error:', error);
        await ctx.reply(`❌ Failed to generate advice: ${error.message}`);
    }
}

module.exports = {
    aiHandler,
    showAIMenu,
    handleQuestion,
};