// src/interfaces/telegram/handlers/incomeHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const RecordIncomeUseCase = require('../../../application/useCases/income/RecordIncomeUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const incomeRepo = new IncomeRepository();
const recordIncomeUseCase = new RecordIncomeUseCase(incomeRepo);

async function incomeHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const session = sessionManager.getSession(telegramId);
        const state = session ? session.state : null;

        switch (state) {
            case 'INCOME_WAITING_SOURCE':
                await handleIncomeSource(ctx, telegramId, user);
                break;
            case 'INCOME_WAITING_AMOUNT':
                await handleIncomeAmount(ctx, telegramId, user);
                break;
            case 'INCOME_WAITING_CATEGORY':
                await handleIncomeCategory(ctx, telegramId, user);
                break;
            default:
                await startIncomeFlow(ctx, telegramId);
                break;
        }

    } catch (error) {
        logger.error('Income handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function startIncomeFlow(ctx, telegramId) {
    sessionManager.createSession(telegramId, 'INCOME_WAITING_SOURCE', {});
    await ctx.reply(
        `💰 **Record Income**\n\n` +
        `Enter the **source** of income:\n` +
        `(e.g., "Commission", "Interest", "Gift", "Rent", "Dividend")\n\n` +
        `Type /cancel to cancel.`
    );
}

async function handleIncomeSource(ctx, telegramId, user) {
    const source = ctx.message.text.trim();
    if (!source || source.length < 2) {
        await ctx.reply('Please enter a valid source name.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { ...session.data, source });
    sessionManager.setState(telegramId, 'INCOME_WAITING_AMOUNT');

    await ctx.reply(
        `💰 Source: **${source}**\n\n` +
        `Enter the **amount**:`
    );
}

async function handleIncomeAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { ...session.data, amount });
    sessionManager.setState(telegramId, 'INCOME_WAITING_CATEGORY');

    await ctx.reply(
        `💰 Amount: ₦${amount.toLocaleString()}\n\n` +
        `Enter a **category** (or type "skip"):\n` +
        `(e.g., "Business", "Personal", "Investment")`
    );
}

async function handleIncomeCategory(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const category = text.toLowerCase() === 'skip' ? 'Other' : text;

    try {
        await recordIncomeUseCase.execute({
            userId: user.id,
            source: session.data.source,
            amount: session.data.amount,
            category: category,
            description: null,
        });

        sessionManager.clearSession(telegramId);

        await ctx.reply(
            `✅ **Income Recorded Successfully!**\n\n` +
            `💰 Source: ${session.data.source}\n` +
            `💵 Amount: ₦${session.data.amount.toLocaleString()}\n` +
            `📂 Category: ${category}\n\n` +
            `📊 Use /dashboard to view your summary.`
        );

    } catch (error) {
        logger.error('Income save error:', error);
        await ctx.reply(`❌ Failed to record income: ${error.message}`);
    }
}

module.exports = incomeHandler;