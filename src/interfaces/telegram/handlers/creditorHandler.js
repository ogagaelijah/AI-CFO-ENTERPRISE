// src/interfaces/telegram/handlers/creditorHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const GetCreditorsUseCase = require('../../../application/useCases/creditors/GetCreditorsUseCase');
const RecordCreditorPaymentUseCase = require('../../../application/useCases/creditors/RecordCreditorPaymentUseCase');
const { getCreditorKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const creditorRepo = new CreditorRepository();
const getCreditorsUseCase = new GetCreditorsUseCase(creditorRepo);
const recordPaymentUseCase = new RecordCreditorPaymentUseCase(creditorRepo);

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
            case 'CREDITOR_WAITING_PAYMENT_AMOUNT':
                await handleCreditorPaymentAmount(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_CONFIRMATION':
                await handleCreditorConfirmation(ctx, telegramId, user);
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

async function showCreditorMenu(ctx, telegramId, user) {
    const creditors = await getCreditorsUseCase.execute(user.id, 'active');
    const summary = await getCreditorsUseCase.getSummary(user.id);

    let message =
        `🏦 **Creditors Register**\n\n` +
        `📊 **Summary**\n` +
        `• Total Creditors: ${summary.total_creditors || 0}\n` +
        `• Total Owed: ₦${(summary.total_outstanding || 0).toLocaleString()}\n` +
        `• Overdue: ${summary.overdue_count || 0}\n\n`;

    if (creditors.length > 0) {
        message += `**Active Creditors:**\n`;
        for (const creditor of creditors.slice(0, 10)) {
            const status = creditor.status === 'OVERDUE' ? '🔴' : '🟡';
            message += `${status} **${creditor.supplier_name}**\n`;
            message += `   💰 ₦${creditor.balance_remaining.toLocaleString()}\n`;
            message += `   🆔 ID: ${creditor.id}\n\n`;
        }
        if (creditors.length > 10) {
            message += `... and ${creditors.length - 10} more.\n\n`;
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

    // ✅ Show confirmation before saving
    sessionManager.setData(telegramId, {
        ...session.data,
        supplierName,
        amount,
        pendingAction: 'add_creditor'
    });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Creditor Details**\n\n` +
        `🏢 Supplier: ${supplierName}\n` +
        `💰 Amount: ₦${amount.toLocaleString()}\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// CREDITOR CONFIRMATION HANDLER
// =============================================
async function handleCreditorConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        // ✅ Save the creditor
        if (session.data.pendingAction === 'add_creditor') {
            await creditorRepo.create({
                user_id: user.id,
                supplier_name: session.data.supplierName,
                total_owed: session.data.amount,
                balance_remaining: session.data.amount,
                status: 'ACTIVE',
            });

            sessionManager.clearSession(telegramId);

            await ctx.reply(
                `✅ **Creditor Added Successfully!**\n\n` +
                `🏢 Supplier: ${session.data.supplierName}\n` +
                `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
                `🔴 Balance: ₦${session.data.amount.toLocaleString()}\n\n` +
                `Select an option below:`,
                { ...getCreditorKeyboard() }
            );
        } else if (session.data.pendingAction === 'record_payment') {
            // ✅ Record the payment
            try {
                const result = await recordPaymentUseCase.execute({
                    creditorId: session.data.creditorId,
                    amount: session.data.amountPaid,
                });

                sessionManager.clearSession(telegramId);

                await ctx.reply(
                    `✅ **Payment Recorded Successfully!**\n\n` +
                    `🏢 Supplier: ${result.supplier_name}\n` +
                    `💰 Paid: ₦${session.data.amountPaid.toLocaleString()}\n` +
                    `🔴 Remaining: ₦${result.balance_remaining.toLocaleString()}\n\n` +
                    `Select an option below:`,
                    { ...getCreditorKeyboard() }
                );

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
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

// =============================================
// RECORD PAYMENT FLOW
// =============================================
async function handleCreditorPaymentAmount(ctx, telegramId, user) {
    const session = sessionManager.getSession(telegramId);
    const text = ctx.message.text.trim();

    // If we haven't selected a creditor yet, the text is the creditor ID
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

        // Store the creditor ID and ask for payment amount
        sessionManager.setData(telegramId, { creditorId: creditorId, creditor: creditor });
        await ctx.reply(
            `💰 **Payment to ${creditor.supplier_name}**\n` +
            `Outstanding: ₦${creditor.balance_remaining.toLocaleString()}\n\n` +
            `Enter the **amount paid**:`
        );
        return;
    }

    // We have a creditor ID, so this is the payment amount
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
            `⚠️ Payment amount (₦${amountPaid.toLocaleString()}) exceeds outstanding balance (₦${creditor.balance_remaining.toLocaleString()}).`
        );
        return;
    }

    // ✅ Show confirmation before saving
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
// LIST CREDITORS
// =============================================
async function listCreditors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const creditors = await getCreditorsUseCase.execute(user.id, 'all');

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
        const creditors = await creditorRepo.findOverdue(user.id);

        if (creditors.length === 0) {
            await ctx.reply('✅ **No overdue creditors!**');
            await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
            return;
        }

        let message = `🔴 **Overdue Creditors**\n\n`;
        for (const creditor of creditors) {
            message += `🏢 ${creditor.supplier_name}\n`;
            message += `   💰 ₦${creditor.balance_remaining.toLocaleString()}\n\n`;
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