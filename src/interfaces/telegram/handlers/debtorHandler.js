// src/interfaces/telegram/handlers/debtorHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const GetDebtorsUseCase = require('../../../application/useCases/debtors/GetDebtorsUseCase');
const RecordDebtorPaymentUseCase = require('../../../application/useCases/debtors/RecordDebtorPaymentUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const debtorRepo = new DebtorRepository();
const getDebtorsUseCase = new GetDebtorsUseCase(debtorRepo);
const recordPaymentUseCase = new RecordDebtorPaymentUseCase(debtorRepo);

async function debtorHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        if (!state || !state.startsWith('DEBTOR_')) {
            await showDebtorMenu(ctx, telegramId, user);
            return;
        }

        switch (state) {
            case 'DEBTOR_WAITING_NAME':
                await handleDebtorName(ctx, telegramId, user);
                break;
            case 'DEBTOR_WAITING_AMOUNT':
                await handleDebtorAmount(ctx, telegramId, user);
                break;
            case 'DEBTOR_WAITING_PAYMENT_ID':
                await handleDebtorPaymentId(ctx, telegramId, user);
                break;
            case 'DEBTOR_WAITING_PAYMENT_AMOUNT':
                await handleDebtorPaymentAmount(ctx, telegramId, user);
                break;
            default:
                await showDebtorMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Debtor handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showDebtorMenu(ctx, telegramId, user) {
    const debtors = await getDebtorsUseCase.execute(user.id, 'active');
    const summary = await getDebtorsUseCase.getSummary(user.id);

    let message =
        `👥 **Debtors Register**\n\n` +
        `📊 **Summary**\n` +
        `• Total Debtors: ${summary.total_debtors || 0}\n` +
        `• Total Owed: ₦${(summary.total_outstanding || 0).toLocaleString()}\n` +
        `• Overdue: ${summary.overdue_count || 0}\n\n`;

    if (debtors.length > 0) {
        message += `**Active Debtors:**\n`;
        for (const debtor of debtors.slice(0, 10)) {
            const status = debtor.status === 'OVERDUE' ? '🔴' : '🟡';
            message += `${status} **${debtor.customer_name}**\n`;
            message += `   💰 ₦${debtor.balance_remaining.toLocaleString()}\n`;
            message += `   🆔 ID: ${debtor.id}\n\n`;
        }
        if (debtors.length > 10) {
            message += `... and ${debtors.length - 10} more.\n\n`;
        }
    } else {
        message += `✅ No active debtors.\n\n`;
    }

    message += `**Commands:**\n` +
        `/debtors add - Add new debtor\n` +
        `/debtors pay - Record payment\n` +
        `/debtors list - View all debtors\n` +
        `/debtors overdue - View overdue debtors`;

    await ctx.reply(message);
}

async function handleDebtorName(ctx, telegramId, user) {
    const text = ctx.message.text.trim();

    if (!text || text.length < 2) {
        await ctx.reply('Please enter the customer name (at least 2 characters).');
        return;
    }

    sessionManager.setData(telegramId, { customerName: text });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_AMOUNT');

    await ctx.reply(
        `👤 Customer: **${text}**\n\n` +
        `Enter the **amount owed**:`
    );
}

async function handleDebtorAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const amount = parseFloat(text);

    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    const customerName = session.data.customerName;

    await debtorRepo.create({
        user_id: user.id,
        customer_name: customerName,
        total_owed: amount,
        balance_remaining: amount,
        status: 'ACTIVE',
    });

    sessionManager.clearSession(telegramId);

    await ctx.reply(
        `✅ **Debtor Added Successfully!**\n\n` +
        `👤 Customer: ${customerName}\n` +
        `💰 Amount: ₦${amount.toLocaleString()}\n` +
        `🔴 Balance: ₦${amount.toLocaleString()}\n\n` +
        `📋 Use /debtors to view all debtors.`
    );
}

async function handleDebtorPaymentId(ctx, telegramId, user) {
    const debtors = await getDebtorsUseCase.execute(user.id, 'active');

    if (debtors.length === 0) {
        await ctx.reply('✅ No active debtors to receive payments from.');
        sessionManager.clearSession(telegramId);
        return;
    }

    let message = `💰 **Record Payment**\n\nSelect a debtor by ID:\n\n`;
    for (const debtor of debtors) {
        message += `🆔 ${debtor.id}: ${debtor.customer_name} - ₦${debtor.balance_remaining.toLocaleString()}\n`;
    }

    message += `\nReply with the debtor ID to proceed.`;

    sessionManager.setData(telegramId, { debtors: debtors });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_PAYMENT_AMOUNT');

    await ctx.reply(message);
}

async function handleDebtorPaymentAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const debtorId = parseInt(text);

    if (isNaN(debtorId) || debtorId <= 0) {
        await ctx.reply('⚠️ Please enter a valid debtor ID.');
        return;
    }

    const debtor = await debtorRepo.findById(debtorId);
    if (!debtor || debtor.user_id !== user.id) {
        await ctx.reply('❌ Debtor not found.');
        sessionManager.setState(telegramId, 'DEBTOR_WAITING_PAYMENT_ID');
        return;
    }

    await ctx.reply(
        `💰 **Payment for ${debtor.customer_name}**\n` +
        `Outstanding: ₦${debtor.balance_remaining.toLocaleString()}\n\n` +
        `Enter the **amount paid**:`
    );

    sessionManager.setData(telegramId, { debtorId: debtorId });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_PAYMENT_AMOUNT');
}

async function listDebtors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const debtors = await getDebtorsUseCase.execute(user.id, 'all');

    if (debtors.length === 0) {
        await ctx.reply('📋 **No debtors found.**');
        return;
    }

    let message = `👥 **All Debtors**\n\n`;
    for (const debtor of debtors) {
        const status = debtor.balance_remaining <= 0 ? '✅ PAID' : debtor.status === 'OVERDUE' ? '🔴 OVERDUE' : '🟡 ACTIVE';
        message += `${status}: **${debtor.customer_name}**\n`;
        message += `   💰 Owed: ₦${debtor.total_owed.toLocaleString()}\n`;
        message += `   💵 Paid: ₦${(debtor.amount_paid || 0).toLocaleString()}\n`;
        message += `   🔴 Balance: ₦${debtor.balance_remaining.toLocaleString()}\n`;
        message += `   🆔 ID: ${debtor.id}\n\n`;
    }

    await ctx.reply(message);
}

async function overdueDebtors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const debtors = await getDebtorsUseCase.execute(user.id, 'overdue');

    if (debtors.length === 0) {
        await ctx.reply('✅ **No overdue debtors!**');
        return;
    }

    let message = `🔴 **Overdue Debtors**\n\n`;
    for (const debtor of debtors) {
        message += `👤 ${debtor.customer_name}\n`;
        message += `   💰 ₦${debtor.balance_remaining.toLocaleString()}\n\n`;
    }

    await ctx.reply(message);
}

module.exports = { debtorHandler, listDebtors, overdueDebtors };