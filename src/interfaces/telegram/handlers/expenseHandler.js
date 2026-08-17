// src/interfaces/telegram/handlers/expenseHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const RecordExpenseUseCase = require('../../../application/useCases/expenses/RecordExpenseUseCase');
const { getExpenseKeyboard } = require('../keyboards/dashboardKeyboard');
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

        // ✅ If no state, show the menu (this is the main menu entry)
        if (!state) {
            await showExpenseMenu(ctx, telegramId, user);
            return;
        }

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
            case 'EXPENSE_WAITING_CONFIRMATION':
                await handleExpenseConfirmation(ctx, telegramId, user);
                break;
            default:
                await showExpenseMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Expense handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

// =============================================
// SHOW EXPENSE MENU
// =============================================
async function showExpenseMenu(ctx, telegramId, user) {
    const summary = await expenseRepo.getExpenseSummary(user.id);

    let message =
        `📉 **Expense Management**\n\n` +
        `📊 **Summary**\n` +
        `• Total Entries: ${summary.total_entries || 0}\n` +
        `• Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
        `• Categories: ${summary.categories_used || 0}\n\n` +
        `Select an option below:`;

    const keyboard = getExpenseKeyboard();

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

// =============================================
// RECORD EXPENSE FLOW - START
// =============================================
async function startExpenseFlow(ctx, telegramId) {
    // ✅ Clear any existing session first
    sessionManager.clearSession(telegramId);
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

    // ✅ Show confirmation
    sessionManager.setData(telegramId, { ...session.data, description, pendingAction: 'record_expense' });
    sessionManager.setState(telegramId, 'EXPENSE_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Expense Details**\n\n` +
        `📂 Category: ${session.data.category}\n` +
        `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
        `📝 Description: ${description || 'N/A'}\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

async function handleExpenseConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        try {
            await recordExpenseUseCase.execute({
                userId: user.id,
                category: session.data.category,
                amount: session.data.amount,
                description: session.data.description,
            });

            sessionManager.clearSession(telegramId);

            await ctx.reply(
                `✅ **Expense Recorded Successfully!**\n\n` +
                `📂 Category: ${session.data.category}\n` +
                `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
                `📝 Description: ${session.data.description || 'N/A'}\n\n` +
                `Select an option below:`,
                { ...getExpenseKeyboard() }
            );

        } catch (error) {
            logger.error('Expense save error:', error);
            await ctx.reply(`❌ Failed to record expense: ${error.message}`);
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Expense Cancelled.**\n\nSelect an option below:`,
            { ...getExpenseKeyboard() }
        );
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

// =============================================
// VIEW ALL EXPENSES
// =============================================
async function listExpenses(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const expenses = await expenseRepo.findByUserId(user.id);

    if (expenses.length === 0) {
        await ctx.reply('📋 **No expense records found.**');
        await ctx.reply(`Select an option below:`, { ...getExpenseKeyboard() });
        return;
    }

    let message = `📉 **All Expense Records**\n\n`;
    for (const exp of expenses.slice(0, 15)) {
        message += `📌 ${exp.category}\n`;
        message += `   💰 ₦${exp.amount.toLocaleString()}\n`;
        message += `   📝 ${exp.description || 'No description'}\n`;
        message += `   📅 ${new Date(exp.created_at).toLocaleDateString()}\n\n`;
    }
    if (expenses.length > 15) {
        message += `... and ${expenses.length - 15} more.`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getExpenseKeyboard() });
}

// =============================================
// EXPENSE SUMMARY
// =============================================
async function expenseSummary(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const summary = await expenseRepo.getExpenseSummary(user.id);

    await ctx.reply(
        `📊 **Expense Summary**\n\n` +
        `📝 Total Entries: ${summary.total_entries || 0}\n` +
        `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
        `📊 Average: ₦${(summary.average_amount || 0).toLocaleString()}\n` +
        `📂 Categories: ${summary.categories_used || 0}`
    );

    await ctx.reply(`Select an option below:`, { ...getExpenseKeyboard() });
}

// =============================================
// TODAY'S EXPENSES
// =============================================
async function expenseToday(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const todayExpenses = await expenseRepo.getTodayExpenses(user.id);

    if (todayExpenses.length === 0) {
        await ctx.reply('📅 **No expenses recorded today.**');
        await ctx.reply(`Select an option below:`, { ...getExpenseKeyboard() });
        return;
    }

    let message = `📅 **Today's Expenses**\n\n`;
    for (const exp of todayExpenses) {
        message += `📌 ${exp.category}\n`;
        message += `   💰 ₦${exp.amount.toLocaleString()}\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getExpenseKeyboard() });
}

module.exports = {
    expenseHandler,
    startExpenseFlow,
    listExpenses,
    expenseSummary,
    expenseToday,
};