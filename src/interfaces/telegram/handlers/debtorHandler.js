// src/interfaces/telegram/handlers/debtorHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const { getDebtorKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const debtorRepo = new DebtorRepository();

const OVERDUE_DAYS = 5;

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
            case 'DEBTOR_WAITING_CONFIRMATION':
                await handleDebtorPaymentConfirmation(ctx, telegramId, user);
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

// =============================================
// SHOW DEBTOR MENU WITH ACTIVE DEBTORS LIST
// =============================================
async function showDebtorMenu(ctx, telegramId, user) {
    try {
        // ✅ Get all debtors from database
        const allDebtors = await debtorRepo.findByUserId(user.id);
        
        // ✅ Filter: ONLY show debtors with balance > 0 AND status != 'PAID'
        const activeDebtors = allDebtors.filter(d => 
            d.balance_remaining > 0 && 
            d.status !== 'PAID'
        );

        // ✅ Calculate summary from filtered list
        const totalOutstanding = activeDebtors.reduce((sum, d) => sum + d.balance_remaining, 0);
        const overdueCount = activeDebtors.filter(d => d.status === 'OVERDUE').length;

        let message =
            `👥 **Debtors Register**\n\n` +
            `📊 **Summary**\n` +
            `• Active Debtors: ${activeDebtors.length}\n` +
            `• Total Owed: ₦${totalOutstanding.toLocaleString()}\n` +
            `• Overdue: ${overdueCount}\n\n`;

        if (activeDebtors && activeDebtors.length > 0) {
            message += `**Active Debtors:**\n`;
            for (const debtor of activeDebtors) {
                const status = debtor.status === 'OVERDUE' ? '🔴' : '🟡';
                const daysOverdue = debtor.due_date ? Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24)) : 0;
                message += `${status} **${debtor.customer_name}**\n`;
                message += `   💰 ₦${debtor.balance_remaining.toLocaleString()}\n`;
                if (debtor.due_date) {
                    message += `   📅 Due: ${new Date(debtor.due_date).toLocaleDateString('en-NG')}\n`;
                    if (daysOverdue > 0) {
                        message += `   ⏰ ${daysOverdue} days overdue\n`;
                    }
                }
                message += `   🆔 ID: ${debtor.id}\n\n`;
            }
        } else {
            message += `✅ No active debtors.\n\n`;
        }

        message += `Select an option below:`;

        const keyboard = getDebtorKeyboard();

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

    } catch (error) {
        logger.error('Show debtor menu error:', error);
        await ctx.reply(`👥 **Debtors Register**\n\nSelect an option below:`, {
            parse_mode: 'Markdown',
            ...getDebtorKeyboard(),
        });
    }
}

// =============================================
// ADD DEBTOR FLOW
// =============================================
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

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + OVERDUE_DAYS);

    sessionManager.setData(telegramId, {
        ...session.data,
        customerName,
        amount,
        dueDate: dueDate.toISOString(),
        pendingAction: 'add_debtor'
    });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Debtor Details**\n\n` +
        `👤 Customer: ${customerName}\n` +
        `💰 Amount: ₦${amount.toLocaleString()}\n` +
        `📅 Due Date: ${dueDate.toLocaleDateString('en-NG')} (${OVERDUE_DAYS} days)\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// RECORD PAYMENT FLOW
// =============================================
async function handleDebtorPaymentId(ctx, telegramId, user) {
    const allDebtors = await debtorRepo.findByUserId(user.id);
    const activeDebtors = allDebtors.filter(d => d.balance_remaining > 0 && d.status !== 'PAID');

    if (activeDebtors.length === 0) {
        await ctx.reply('✅ No active debtors to receive payments from.');
        await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
        return;
    }

    let message = `💰 **Record Payment**\n\nSelect a debtor by ID:\n\n`;
    for (const debtor of activeDebtors) {
        message += `🆔 ${debtor.id}: ${debtor.customer_name} - ₦${debtor.balance_remaining.toLocaleString()}\n`;
        if (debtor.due_date) {
            const daysOverdue = Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue > 0) {
                message += `   ⏰ ${daysOverdue} days overdue\n`;
            }
        }
    }

    message += `\nEnter the debtor ID to proceed.`;

    sessionManager.setData(telegramId, { debtors: activeDebtors });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_PAYMENT_AMOUNT');

    await ctx.reply(message);
}

async function handleDebtorPaymentAmount(ctx, telegramId, user) {
    const session = sessionManager.getSession(telegramId);
    const text = ctx.message.text.trim();

    if (!session.data.debtorId) {
        const debtorId = parseInt(text);
        if (isNaN(debtorId) || debtorId <= 0) {
            await ctx.reply('⚠️ Please enter a valid debtor ID.');
            return;
        }

        const debtor = await debtorRepo.findById(debtorId);
        if (!debtor || debtor.user_id !== user.id) {
            await ctx.reply('❌ Debtor not found.');
            return;
        }

        if (debtor.balance_remaining <= 0) {
            await ctx.reply(`✅ ${debtor.customer_name} has already been fully paid.`);
            await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
            sessionManager.clearSession(telegramId);
            return;
        }

        sessionManager.setData(telegramId, { debtorId: debtorId, debtor: debtor });
        await ctx.reply(
            `💰 **Payment for ${debtor.customer_name}**\n` +
            `Outstanding: ₦${debtor.balance_remaining.toLocaleString()}\n\n` +
            `Enter the **amount paid**:`
        );
        return;
    }

    const amountPaid = parseFloat(text.replace(/,/g, ''));
    if (isNaN(amountPaid) || amountPaid <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive amount.');
        return;
    }

    const debtorId = session.data.debtorId;
    const debtor = await debtorRepo.findById(debtorId);

    if (!debtor || debtor.user_id !== user.id) {
        await ctx.reply('❌ Debtor not found.');
        sessionManager.clearSession(telegramId);
        return;
    }

    if (amountPaid > debtor.balance_remaining) {
        await ctx.reply(
            `⚠️ Payment amount (₦${amountPaid.toLocaleString()}) exceeds outstanding balance (₦${debtor.balance_remaining.toLocaleString()}).\n\n` +
            `Please enter a lower amount or the full balance of ₦${debtor.balance_remaining.toLocaleString()}.`
        );
        return;
    }

    sessionManager.setData(telegramId, {
        ...session.data,
        debtorId,
        debtor,
        amountPaid,
        pendingAction: 'record_payment'
    });
    sessionManager.setState(telegramId, 'DEBTOR_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Payment**\n\n` +
        `👤 Customer: ${debtor.customer_name}\n` +
        `💰 Amount: ₦${amountPaid.toLocaleString()}\n` +
        `🔴 Remaining After Payment: ₦${(debtor.balance_remaining - amountPaid).toLocaleString()}\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// CONFIRMATION HANDLER
// =============================================
async function handleDebtorPaymentConfirmation(ctx, telegramId, user) {
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
        await showDebtorMenu(ctx, telegramId, user);
        return;
    }

    if (text === 'YES') {
        if (session.data.pendingAction === 'add_debtor') {
            await debtorRepo.create({
                user_id: user.id,
                customer_name: session.data.customerName,
                total_owed: session.data.amount,
                balance_remaining: session.data.amount,
                status: 'ACTIVE',
                due_date: session.data.dueDate,
            });

            sessionManager.clearSession(telegramId);

            await ctx.reply(
                `✅ **Debtor Added Successfully!**\n\n` +
                `👤 Customer: ${session.data.customerName}\n` +
                `💰 Amount: ₦${session.data.amount.toLocaleString()}\n` +
                `📅 Due: ${new Date(session.data.dueDate).toLocaleDateString('en-NG')}\n\n` +
                `Select an option below:`,
                { ...getDebtorKeyboard() }
            );
        } else if (session.data.pendingAction === 'record_payment') {
            try {
                await debtorRepo.recordPayment(session.data.debtorId, session.data.amountPaid);

                const debtor = session.data.debtor;
                const remainingBalance = debtor.balance_remaining - session.data.amountPaid;

                sessionManager.clearSession(telegramId);

                let message =
                    `✅ **Payment Recorded Successfully!**\n\n` +
                    `👤 Customer: ${debtor.customer_name}\n` +
                    `💰 Paid: ₦${session.data.amountPaid.toLocaleString()}\n` +
                    `🔴 Remaining: ₦${remainingBalance.toLocaleString()}\n`;

                if (remainingBalance <= 0) {
                    message += `\n🎉 **${debtor.customer_name} is now fully paid!**\n`;
                }

                message += `\nSelect an option below:`;

                await ctx.reply(message, { ...getDebtorKeyboard() });

            } catch (error) {
                logger.error('Debtor payment error:', error);
                await ctx.reply(`❌ Failed to record payment: ${error.message}`);
            }
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Operation Cancelled.**\n\nSelect an option below:`,
            { ...getDebtorKeyboard() }
        );
    } else {
        const debtor = session.data.debtor;
        const amountPaid = session.data.amountPaid;
        const remainingAfter = debtor ? debtor.balance_remaining - amountPaid : 0;

        let message =
            `⚠️ Please reply with **YES** or **NO**.\n\n` +
            `📋 **Confirm Payment**\n\n` +
            `👤 Customer: ${debtor ? debtor.customer_name : 'N/A'}\n` +
            `💰 Amount: ₦${(amountPaid || 0).toLocaleString()}\n` +
            `🔴 Remaining After Payment: ₦${remainingAfter.toLocaleString()}\n\n` +
            `Reply with **YES** to confirm or **NO** to cancel.`;

        await ctx.reply(message);
    }
}

// =============================================
// LIST ALL DEBTORS (Including Paid)
// =============================================
async function listDebtors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const debtors = await debtorRepo.findByUserId(user.id);

    if (debtors.length === 0) {
        await ctx.reply('📋 **No debtors found.**');
        await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
        return;
    }

    let message = `👥 **All Debtors**\n\n`;
    for (const debtor of debtors) {
        const status = debtor.balance_remaining <= 0 ? '✅ PAID' : debtor.status === 'OVERDUE' ? '🔴 OVERDUE' : '🟡 ACTIVE';
        message += `${status}: **${debtor.customer_name}**\n`;
        message += `   💰 Owed: ₦${debtor.total_owed.toLocaleString()}\n`;
        message += `   💵 Paid: ₦${(debtor.amount_paid || 0).toLocaleString()}\n`;
        message += `   🔴 Balance: ₦${debtor.balance_remaining.toLocaleString()}\n`;
        if (debtor.due_date) {
            const daysOverdue = Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue > 0) {
                message += `   ⏰ ${daysOverdue} days overdue\n`;
            }
        }
        message += `   🆔 ID: ${debtor.id}\n\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
}

// =============================================
// OVERDUE DEBTORS
// =============================================
async function overdueDebtors(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    try {
        const allDebtors = await debtorRepo.findByUserId(user.id);
        const overdue = allDebtors.filter(d => 
            d.balance_remaining > 0 && 
            d.status === 'OVERDUE'
        );

        if (overdue.length === 0) {
            await ctx.reply('✅ **No overdue debtors!**');
            await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
            return;
        }

        let message = `🔴 **Overdue Debtors**\n\n`;
        for (const debtor of overdue) {
            const daysOverdue = debtor.due_date ? Math.ceil((new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24)) : 0;
            message += `👤 ${debtor.customer_name}\n`;
            message += `   💰 ₦${debtor.balance_remaining.toLocaleString()}\n`;
            message += `   ⏰ ${daysOverdue} days overdue\n\n`;
        }

        await ctx.reply(message);
        await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });

    } catch (error) {
        logger.error('Overdue debtors error:', error);
        await ctx.reply('❌ Failed to load overdue debtors. Please try again.');
        await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
    }
}

module.exports = { debtorHandler, listDebtors, overdueDebtors };