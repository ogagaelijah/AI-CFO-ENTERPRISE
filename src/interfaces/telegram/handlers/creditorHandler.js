// src/interfaces/telegram/handlers/creditorHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const { getCreditorKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const creditorRepo = new CreditorRepository();

const OVERDUE_DAYS = 5;

async function creditorHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        if (!state || !state.startsWith('CREDITOR_')) {
            await showCreditorMenu(ctx, telegramId, user);
            return;
        }

        switch (state) {
            case 'CREDITOR_WAITING_NAME':
                await handleCreditorName(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_AMOUNT':
                await handleCreditorAmount(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_PAYMENT_ID':
                await handleCreditorPaymentId(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_PAYMENT_AMOUNT':
                await handleCreditorPaymentAmount(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_CONFIRMATION':
                await handleCreditorPaymentConfirmation(ctx, telegramId, user);
                break;
            default:
                await showCreditorMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Creditor handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

// =============================================
// SHOW CREDITOR MENU WITH ACTIVE CREDITORS LIST
// =============================================
async function showCreditorMenu(ctx, telegramId, user) {
    try {
        // ✅ Get all creditors
        const allCreditors = await creditorRepo.findByUserId(user.id);
        
        // ✅ FILTER: ONLY show creditors with balance > 0 AND status != 'PAID'
        const activeCreditors = allCreditors.filter(c => 
            c.balance_remaining > 0 && 
            c.status !== 'PAID'
        );

        const totalOutstanding = activeCreditors.reduce((sum, c) => sum + c.balance_remaining, 0);
        const overdueCount = activeCreditors.filter(c => c.status === 'OVERDUE').length;

        let message =
            `🏦 **Creditors Register**\n\n` +
            `📊 **Summary**\n` +
            `• Active Creditors: ${activeCreditors.length}\n` +
            `• Total Owed: ₦${totalOutstanding.toLocaleString()}\n` +
            `• Overdue: ${overdueCount}\n\n`;

        if (activeCreditors.length > 0) {
            message += `**Active Creditors:**\n`;
            for (const creditor of activeCreditors) {
                const status = creditor.status === 'OVERDUE' ? '🔴' : '🟡';
                const daysOverdue = creditor.due_date ? Math.ceil((new Date() - new Date(creditor.due_date)) / (1000 * 60 * 60 * 24)) : 0;
                message += `${status} **${creditor.supplier_name}**\n`;
                message += `   💰 ₦${creditor.balance_remaining.toLocaleString()}\n`;
                if (creditor.due_date) {
                    message += `   📅 Due: ${new Date(creditor.due_date).toLocaleDateString('en-NG')}\n`;
                    if (daysOverdue > 0) {
                        message += `   ⏰ ${daysOverdue} days overdue\n`;
                    }
                }
                message += `   🆔 ID: ${creditor.id}\n\n`;
            }
        } else {
            message += `✅ No active creditors.\n\n`;
        }

        message += `Select an option below:`;

        const keyboard = getCreditorKeyboard();

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

    } catch (error) {
        logger.error('Show creditor menu error:', error);
        await ctx.reply(`🏦 **Creditors Register**\n\nSelect an option below:`, {
            parse_mode: 'Markdown',
            ...getCreditorKeyboard(),
        });
    }
}

// =============================================
// ADD CREDITOR FLOW
// =============================================
async function handleCreditorName(ctx, telegramId, user) {
    const text = ctx.message.text.trim();

    if (!text || text.length < 2) {
        await ctx.reply('Please enter the supplier name (at least 2 characters).');
        return;
    }

    sessionManager.setData(telegramId, { supplierName: text });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_AMOUNT');

    await ctx.reply(
        `🏢 Supplier: **${text}**\n\n` +
        `Enter the **amount owed**:`
    );
}

async function handleCreditorAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    const supplierName = session.data.supplierName;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + OVERDUE_DAYS);

    sessionManager.setData(telegramId, {
        ...session.data,
        supplierName,
        amount,
        dueDate: dueDate.toISOString(),
        pendingAction: 'add_creditor'
    });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Creditor Details**\n\n` +
        `🏢 Supplier: ${supplierName}\n` +
        `💰 Amount: ₦${amount.toLocaleString()}\n` +
        `📅 Due Date: ${dueDate.toLocaleDateString('en-NG')} (${OVERDUE_DAYS} days)\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// RECORD PAYMENT FLOW - START
// =============================================
async function handleCreditorPaymentId(ctx, telegramId, user) {
    const allCreditors = await creditorRepo.findByUserId(user.id);
    const activeCreditors = allCreditors.filter(c => c.balance_remaining > 0 && c.status !== 'PAID');

    if (activeCreditors.length === 0) {
        await ctx.reply('✅ No active creditors to make payments to.');
        await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
        return;
    }

    let message = `💰 **Record Payment to Creditor**\n\nSelect a creditor by ID:\n\n`;
    for (const creditor of activeCreditors) {
        message += `🆔 ${creditor.id}: ${creditor.supplier_name} - ₦${creditor.balance_remaining.toLocaleString()}\n`;
        if (creditor.due_date) {
            const daysOverdue = Math.ceil((new Date() - new Date(creditor.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue > 0) {
                message += `   ⏰ ${daysOverdue} days overdue\n`;
            }
        }
    }

    message += `\nEnter the creditor ID to proceed.`;

    sessionManager.setData(telegramId, { creditors: activeCreditors });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_PAYMENT_AMOUNT');

    await ctx.reply(message);
}

async function handleCreditorPaymentAmount(ctx, telegramId, user) {
    const session = sessionManager.getSession(telegramId);
    const text = ctx.message.text.trim();

    if (!session.data.creditorId) {
        const creditorId = parseInt(text);
        if (isNaN(creditorId) || creditorId <= 0) {
            await ctx.reply('⚠️ Please enter a valid creditor ID.');
            return;
        }

        const creditor = await creditorRepo.findById(creditorId);
        if (!creditor || creditor.user_id !== user.id) {
            await ctx.reply('❌ Creditor not found.');
            return;
        }

        if (creditor.balance_remaining <= 0) {
            await ctx.reply(`✅ ${creditor.supplier_name} has already been fully paid.`);
            await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
            sessionManager.clearSession(telegramId);
            return;
        }

        sessionManager.setData(telegramId, { creditorId: creditorId, creditor: creditor });
        await ctx.reply(
            `💰 **Payment to ${creditor.supplier_name}**\n` +
            `Outstanding: ₦${creditor.balance_remaining.toLocaleString()}\n\n` +
            `Enter the **amount paid**:`
        );
        return;
    }

    const amountPaid = parseFloat(text.replace(/,/g, ''));
    if (isNaN(amountPaid) || amountPaid <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const creditorId = session.data.creditorId;
    const creditor = await creditorRepo.findById(creditorId);

    if (!creditor || creditor.user_id !== user.id) {
        await ctx.reply('❌ Creditor not found.');
        sessionManager.clearSession(telegramId);
        return;
    }

    if (amountPaid > creditor.balance_remaining) {
        await ctx.reply(
            `⚠️ Payment amount (₦${amountPaid.toLocaleString()}) exceeds outstanding balance (₦${creditor.balance_remaining.toLocaleString()}).\n\n` +
            `Please enter a lower amount or the full balance of ₦${creditor.balance_remaining.toLocaleString()}.`
        );
        return;
    }

    sessionManager.setData(telegramId, {
        ...session.data,
        creditorId,
        creditor,
        amountPaid,
        pendingAction: 'record_payment'
    });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Payment**\n\n` +
        `🏢 Supplier: ${creditor.supplier_name}\n` +
        `💰 Amount: ₦${amountPaid.toLocaleString()}\n` +
        `🔴 Remaining After Payment: ₦${(creditor.balance_remaining - amountPaid).toLocaleString()}\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// CONFIRMATION HANDLER
// =============================================
async function handleCreditorPaymentConfirmation(ctx, telegramId, user) {
    let text = '';

    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim().toUpperCase();
    } else if (ctx.callbackQuery && ctx.callbackQuery.data) {
        text = ctx.callbackQuery.data.trim().toUpperCase();
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    const session = sessionManager.getSession(telegramId);

    if (!session) {
        await showCreditorMenu(ctx, telegramId, user);
        return;
    }

    if (text === 'YES') {
        if (session.data.pendingAction === 'add_creditor') {
            await creditorRepo.create({
                user_id: user.id,
                supplier_name: session.data.supplierName,
                total_owed: session.data.amount,
                balance_remaining: session.data.amount,
                status: 'ACTIVE',
                due_date: session.data.dueDate,
            });

            sessionManager.clearSession(telegramId);

            await ctx.reply(
                `✅ **Creditor Added Successfully!**\n\n` +
                `🏢 Supplier: ${session.data.supplierName}\n` +
                `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
                `📅 Due: ${new Date(session.data.dueDate).toLocaleDateString('en-NG')}\n\n` +
                `Select an option below:`,
                { ...getCreditorKeyboard() }
            );
        } else if (session.data.pendingAction === 'record_payment') {
            try {
                await creditorRepo.recordPayment(session.data.creditorId, session.data.amountPaid);

                const creditor = session.data.creditor;
                const remainingBalance = creditor.balance_remaining - session.data.amountPaid;

                sessionManager.clearSession(telegramId);

                let message =
                    `✅ **Payment Recorded Successfully!**\n\n` +
                    `🏢 Supplier: ${creditor.supplier_name}\n` +
                    `💰 Paid: ₦${session.data.amountPaid.toLocaleString()}\n` +
                    `🔴 Remaining: ₦${remainingBalance.toLocaleString()}\n`;

                if (remainingBalance <= 0) {
                    message += `\n🎉 **${creditor.supplier_name} is now fully paid!**\n`;
                }

                message += `\nSelect an option below:`;

                await ctx.reply(message, { ...getCreditorKeyboard() });

            } catch (error) {
                logger.error('Creditor payment error:', error);
                await ctx.reply(`❌ Failed to record payment: ${error.message}`);
            }
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Operation Cancelled.**\n\nSelect an option below:`,
            { ...getCreditorKeyboard() }
        );
    } else {
        const creditor = session.data.creditor;
        const amountPaid = session.data.amountPaid;
        const remainingAfter = creditor ? creditor.balance_remaining - amountPaid : 0;

        let message =
            `⚠️ Please reply with **YES** or **NO**.\n\n` +
            `📋 **Confirm Payment**\n\n` +
            `🏢 Supplier: ${creditor ? creditor.supplier_name : 'N/A'}\n` +
            `💰 Amount: ₦${(amountPaid || 0).toLocaleString()}\n` +
            `🔴 Remaining After Payment: ₦${remainingAfter.toLocaleString()}\n\n` +
            `Reply with **YES** to confirm or **NO** to cancel.`;

        await ctx.reply(message);
    }
}

// =============================================
// LIST ALL CREDITORS (Including Paid)
// =============================================
async function listCreditors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const creditors = await creditorRepo.findByUserId(user.id);

    if (creditors.length === 0) {
        await ctx.reply('📋 **No creditors found.**');
        await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
        return;
    }

    let message = `🏦 **All Creditors**\n\n`;
    for (const creditor of creditors) {
        const status = creditor.balance_remaining <= 0 ? '✅ PAID' : creditor.status === 'OVERDUE' ? '🔴 OVERDUE' : '🟡 ACTIVE';
        message += `${status}: **${creditor.supplier_name}**\n`;
        message += `   💰 Owed: ₦${creditor.total_owed.toLocaleString()}\n`;
        message += `   💵 Paid: ₦${(creditor.amount_paid || 0).toLocaleString()}\n`;
        message += `   🔴 Balance: ₦${creditor.balance_remaining.toLocaleString()}\n`;
        if (creditor.due_date) {
            const daysOverdue = Math.ceil((new Date() - new Date(creditor.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue > 0) {
                message += `   ⏰ ${daysOverdue} days overdue\n`;
            }
        }
        message += `   🆔 ID: ${creditor.id}\n\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
}

// =============================================
// OVERDUE CREDITORS
// =============================================
async function overdueCreditors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    try {
        const allCreditors = await creditorRepo.findByUserId(user.id);
        const overdue = allCreditors.filter(c => 
            c.balance_remaining > 0 && 
            c.status === 'OVERDUE'
        );

        if (overdue.length === 0) {
            await ctx.reply('✅ **No overdue creditors!**');
            await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
            return;
        }

        let message = `🔴 **Overdue Creditors**\n\n`;
        for (const creditor of overdue) {
            const daysOverdue = creditor.due_date ? Math.ceil((new Date() - new Date(creditor.due_date)) / (1000 * 60 * 60 * 24)) : 0;
            message += `🏢 ${creditor.supplier_name}\n`;
            message += `   💰 ₦${creditor.balance_remaining.toLocaleString()}\n`;
            message += `   ⏰ ${daysOverdue} days overdue\n\n`;
        }

        await ctx.reply(message);
        await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });

    } catch (error) {
        logger.error('Overdue creditors error:', error);
        await ctx.reply('❌ Failed to load overdue creditors. Please try again.');
        await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
    }
}

module.exports = {
    creditorHandler,
    listCreditors,
    overdueCreditors,
};