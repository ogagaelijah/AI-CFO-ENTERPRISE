// src/interfaces/telegram/handlers/incomeHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const RecordIncomeUseCase = require('../../../application/useCases/income/RecordIncomeUseCase');
const { getIncomeKeyboard } = require('../keyboards/dashboardKeyboard');
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

        // ✅ If no state, this is a fresh call - show the menu
        if (!state) {
            await showIncomeMenu(ctx, telegramId, user);
            return;
        }

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
            case 'INCOME_WAITING_CONFIRMATION':
                await handleIncomeConfirmation(ctx, telegramId, user);
                break;
            default:
                await showIncomeMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Income handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

// =============================================
// SHOW INCOME MENU
// =============================================
async function showIncomeMenu(ctx, telegramId, user) {
    const summary = await incomeRepo.getIncomeSummary(user.id);

    let message =
        `💰 **Income Management**\n\n` +
        `📊 **Summary**\n` +
        `• Total Entries: ${summary.total_entries || 0}\n` +
        `• Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
        `• Categories: ${summary.categories_used || 0}\n\n` +
        `Select an option below:`;

    const keyboard = getIncomeKeyboard();

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

// =============================================
// RECORD INCOME FLOW - START
// =============================================
async function startIncomeFlow(ctx, telegramId) {
    // ✅ Clear any existing session first
    sessionManager.clearSession(telegramId);
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

    // ✅ Show confirmation
    sessionManager.setData(telegramId, { ...session.data, category, pendingAction: 'record_income' });
    sessionManager.setState(telegramId, 'INCOME_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Income Details**\n\n` +
        `💰 Source: ${session.data.source}\n` +
        `💵 Amount: ₦${session.data.amount.toLocaleString()}\n` +
        `📂 Category: ${category}\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

async function handleIncomeConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        try {
            await recordIncomeUseCase.execute({
                userId: user.id,
                source: session.data.source,
                amount: session.data.amount,
                category: session.data.category,
                description: null,
            });

            sessionManager.clearSession(telegramId);

            await ctx.reply(
                `✅ **Income Recorded Successfully!**\n\n` +
                `💰 Source: ${session.data.source}\n` +
                `💵 Amount: ₦${session.data.amount.toLocaleString()}\n` +
                `📂 Category: ${session.data.category}\n\n` +
                `Select an option below:`,
                { ...getIncomeKeyboard() }
            );

        } catch (error) {
            logger.error('Income save error:', error);
            await ctx.reply(`❌ Failed to record income: ${error.message}`);
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Income Cancelled.**\n\nSelect an option below:`,
            { ...getIncomeKeyboard() }
        );
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

// =============================================
// VIEW ALL INCOME
// =============================================
async function listIncome(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const incomes = await incomeRepo.findByUserId(user.id);

    if (incomes.length === 0) {
        await ctx.reply('📋 **No income records found.**');
        await ctx.reply(`Select an option below:`, { ...getIncomeKeyboard() });
        return;
    }

    let message = `💰 **All Income Records**\n\n`;
    for (const inc of incomes.slice(0, 15)) {
        message += `📌 ${inc.source}\n`;
        message += `   💰 ₦${inc.amount.toLocaleString()}\n`;
        message += `   📂 ${inc.category || 'Other'}\n`;
        message += `   📅 ${new Date(inc.created_at).toLocaleDateString()}\n\n`;
    }
    if (incomes.length > 15) {
        message += `... and ${incomes.length - 15} more.`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getIncomeKeyboard() });
}

// =============================================
// INCOME SUMMARY
// =============================================
async function incomeSummary(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const summary = await incomeRepo.getIncomeSummary(user.id);

    await ctx.reply(
        `📊 **Income Summary**\n\n` +
        `📝 Total Entries: ${summary.total_entries || 0}\n` +
        `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
        `📊 Average: ₦${(summary.average_amount || 0).toLocaleString()}\n` +
        `📂 Categories: ${summary.categories_used || 0}`
    );

    await ctx.reply(`Select an option below:`, { ...getIncomeKeyboard() });
}

// =============================================
// TODAY'S INCOME
// =============================================
async function incomeToday(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const todayIncome = await incomeRepo.getTodayIncome(user.id);

    if (todayIncome.length === 0) {
        await ctx.reply('📅 **No income recorded today.**');
        await ctx.reply(`Select an option below:`, { ...getIncomeKeyboard() });
        return;
    }

    let message = `📅 **Today's Income**\n\n`;
    for (const inc of todayIncome) {
        message += `📌 ${inc.source}\n`;
        message += `   💰 ₦${inc.amount.toLocaleString()}\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getIncomeKeyboard() });
}

module.exports = {
    incomeHandler,
    startIncomeFlow,
    listIncome,
    incomeSummary,
    incomeToday,
};