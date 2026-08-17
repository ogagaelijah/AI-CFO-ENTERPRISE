// src/interfaces/telegram/handlers/creditorHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const GetCreditorsUseCase = require('../../../application/useCases/creditors/GetCreditorsUseCase');
const RecordCreditorPaymentUseCase = require('../../../application/useCases/creditors/RecordCreditorPaymentUseCase');
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
            case 'CREDITOR_WAITING_PAYMENT_ID':
                await handleCreditorPaymentId(ctx, telegramId, user);
                break;
            case 'CREDITOR_WAITING_PAYMENT_AMOUNT':
                await handleCreditorPaymentAmount(ctx, telegramId, user);
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

    message += `**Commands:**\n` +
        `/creditors add - Add new creditor\n` +
        `/creditors pay - Record payment\n` +
        `/creditors list - View all creditors\n` +
        `/creditors overdue - View overdue creditors`;

    await ctx.reply(message);
}

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

    await creditorRepo.create({
        user_id: user.id,
        supplier_name: supplierName,
        total_owed: amount,
        balance_remaining: amount,
        status: 'ACTIVE',
    });

    sessionManager.clearSession(telegramId);

    await ctx.reply(
        `✅ **Creditor Added Successfully!**\n\n` +
        `🏢 Supplier: ${supplierName}\n` +
        `💰 Amount: ₦${amount.toLocaleString()}\n` +
        `🔴 Balance: ₦${amount.toLocaleString()}\n\n` +
        `📋 Use /creditors to view all creditors.`
    );
}

async function handleCreditorPaymentId(ctx, telegramId, user) {
    const creditors = await getCreditorsUseCase.execute(user.id, 'active');

    if (creditors.length === 0) {
        await ctx.reply('✅ No active creditors to make payments to.');
        sessionManager.clearSession(telegramId);
        return;
    }

    let message = `💰 **Record Payment to Creditor**\n\nSelect a creditor by ID:\n\n`;
    for (const creditor of creditors) {
        message += `🆔 ${creditor.id}: ${creditor.supplier_name} - ₦${creditor.balance_remaining.toLocaleString()}\n`;
    }

    message += `\nReply with the creditor ID to proceed.`;

    sessionManager.setData(telegramId, { creditors: creditors });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_PAYMENT_AMOUNT');

    await ctx.reply(message);
}

async function handleCreditorPaymentAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const creditorId = parseInt(text);

    if (isNaN(creditorId) || creditorId <= 0) {
        await ctx.reply('⚠️ Please enter a valid creditor ID.');
        return;
    }

    const creditor = await creditorRepo.findById(creditorId);
    if (!creditor || creditor.user_id !== user.id) {
        await ctx.reply('❌ Creditor not found.');
        sessionManager.setState(telegramId, 'CREDITOR_WAITING_PAYMENT_ID');
        return;
    }

    await ctx.reply(
        `💰 **Payment to ${creditor.supplier_name}**\n` +
        `Outstanding: ₦${creditor.balance_remaining.toLocaleString()}\n\n` +
        `Enter the **amount paid**:`
    );

    sessionManager.setData(telegramId, { creditorId: creditorId });
    sessionManager.setState(telegramId, 'CREDITOR_WAITING_PAYMENT_AMOUNT');
}

async function handleCreditorPaymentAmount2(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    const creditorId = session.data.creditorId;

    try {
        const result = await recordPaymentUseCase.execute({
            creditorId: creditorId,
            amount: amount,
        });

        sessionManager.clearSession(telegramId);

        await ctx.reply(
            `✅ **Payment Recorded Successfully!**\n\n` +
            `🏢 Supplier: ${result.supplier_name}\n` +
            `💰 Paid: ₦${amount.toLocaleString()}\n` +
            `🔴 Remaining: ₦${result.balance_remaining.toLocaleString()}\n\n` +
            `📋 Use /creditors to view all creditors.`
        );

    } catch (error) {
        logger.error('Creditor payment error:', error);
        await ctx.reply(`❌ Failed to record payment: ${error.message}`);
    }
}

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
}

async function overdueCreditors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const creditors = await getCreditorsUseCase.execute(user.id, 'overdue');

    if (creditors.length === 0) {
        await ctx.reply('✅ **No overdue creditors!**');
        return;
    }

    let message = `🔴 **Overdue Creditors**\n\n`;
    for (const creditor of creditors) {
        message += `🏢 ${creditor.supplier_name}\n`;
        message += `   💰 ₦${creditor.balance_remaining.toLocaleString()}\n\n`;
    }

    await ctx.reply(message);
}

module.exports = {
    creditorHandler,
    listCreditors,
    overdueCreditors,
};