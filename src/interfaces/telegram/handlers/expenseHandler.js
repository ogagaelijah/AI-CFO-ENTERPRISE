// src/interfaces/telegram/handlers/expenseHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const RecordExpenseUseCase = require('../../../application/useCases/expenses/RecordExpenseUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const expenseRepo = new ExpenseRepository();
const recordExpenseUseCase = new RecordExpenseUseCase(expenseRepo);

async function expenseHandler(ctx) {
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
            case 'EXPENSE_WAITING_CATEGORY':
                await handleExpenseCategory(ctx, telegramId, user);
                break;
            case 'EXPENSE_WAITING_AMOUNT':
                await handleExpenseAmount(ctx, telegramId, user);
                break;
            case 'EXPENSE_WAITING_DESCRIPTION':
                await handleExpenseDescription(ctx, telegramId, user);
                break;
            default:
                await startExpenseFlow(ctx, telegramId);
                break;
        }

    } catch (error) {
        logger.error('Expense handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function startExpenseFlow(ctx, telegramId) {
    sessionManager.createSession(telegramId, 'EXPENSE_WAITING_CATEGORY', {});
    await ctx.reply(
        `📉 **Record Expense**\n\n` +
        `Enter the **category** of expense:\n` +
        `(e.g., "Rent", "Utilities", "Salary", "Transport", "Marketing")\n\n` +
        `Type /cancel to cancel.`
    );
}

async function handleExpenseCategory(ctx, telegramId, user) {
    const category = ctx.message.text.trim();
    if (!category || category.length < 2) {
        await ctx.reply('Please enter a valid category name.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { ...session.data, category });
    sessionManager.setState(telegramId, 'EXPENSE_WAITING_AMOUNT');

    await ctx.reply(
        `📂 Category: **${category}**\n\n` +
        `Enter the **amount**:`
    );
}

async function handleExpenseAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { ...session.data, amount });
    sessionManager.setState(telegramId, 'EXPENSE_WAITING_DESCRIPTION');

    await ctx.reply(
        `💰 Amount: ₦${amount.toLocaleString()}\n\n` +
        `Enter a **description** (or type "skip"):\n` +
        `(e.g., "June office rent", "Staff salaries")`
    );
}

async function handleExpenseDescription(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const description = text.toLowerCase() === 'skip' ? null : text;

    try {
        await recordExpenseUseCase.execute({
            userId: user.id,
            category: session.data.category,
            amount: session.data.amount,
            description: description,
        });

        sessionManager.clearSession(telegramId);

        await ctx.reply(
            `✅ **Expense Recorded Successfully!**\n\n` +
            `📂 Category: ${session.data.category}\n` +
            `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
            `📝 Description: ${description || 'N/A'}\n\n` +
            `📊 Use /dashboard to view your summary.`
        );

    } catch (error) {
        logger.error('Expense save error:', error);
        await ctx.reply(`❌ Failed to record expense: ${error.message}`);
    }
}

module.exports = expenseHandler;