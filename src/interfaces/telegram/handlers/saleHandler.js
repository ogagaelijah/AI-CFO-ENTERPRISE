// src/interfaces/telegram/handlers/saleHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const RecordSaleUseCase = require('../../../application/useCases/sales/RecordSaleUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const saleRepo = new SaleRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const recordSaleUseCase = new RecordSaleUseCase(saleRepo, inventoryRepo, debtorRepo);

async function saleHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        switch (state) {
            case 'SALE_WAITING_ITEM':
                await handleSaleItem(ctx, telegramId, user);
                break;
            case 'SALE_WAITING_QUANTITY':
                await handleSaleQuantity(ctx, telegramId, user);
                break;
            case 'SALE_WAITING_PRICE':
                await handleSalePrice(ctx, telegramId, user);
                break;
            case 'SALE_WAITING_CUSTOMER':
                await handleSaleCustomer(ctx, telegramId, user);
                break;
            case 'SALE_WAITING_PAYMENT':
                await handleSalePayment(ctx, telegramId, user);
                break;
            case 'SALE_WAITING_PARTIAL_AMOUNT':
                await handlePartialAmount(ctx, telegramId, user);
                break;
            default:
                await startSaleFlow(ctx, telegramId);
                break;
        }

    } catch (error) {
        logger.error('Sale handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function startSaleFlow(ctx, telegramId) {
    sessionManager.createSession(telegramId, 'SALE_WAITING_ITEM', {});
    await ctx.reply(
        `📝 **Record a Sale**\n\n` +
        `Enter the **item name** you are selling.\n\n` +
        `Type /cancel to cancel.`
    );
}

async function handleSaleItem(ctx, telegramId, user) {
    const itemName = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);

    if (!itemName || itemName.length < 2) {
        await ctx.reply('Please enter a valid item name (at least 2 characters).');
        return;
    }

    // Check if item exists in inventory
    const inventoryItem = await inventoryRepo.findByName(user.id, itemName);

    if (!inventoryItem) {
        await ctx.reply(
            `⚠️ "${itemName}" not found in inventory.\n\n` +
            `You can still record this sale, but inventory will not be updated.\n` +
            `Continue? Type **YES** or **NO**.`
        );
        sessionManager.setData(telegramId, { ...session.data, itemName, pendingCheck: true });
        return;
    }

    if (inventoryItem.quantity <= 0) {
        await ctx.reply(
            `⚠️ "${itemName}" is **out of stock**.\n` +
            `Available: 0\n\n` +
            `Please add stock first using /inventory.`
        );
        return;
    }

    sessionManager.setData(telegramId, {
        ...session.data,
        itemName,
        inventoryId: inventoryItem.id,
        currentStock: inventoryItem.quantity
    });
    sessionManager.setState(telegramId, 'SALE_WAITING_QUANTITY');

    await ctx.reply(
        `📦 **${itemName}**\n` +
        `Available stock: **${inventoryItem.quantity}** units\n\n` +
        `Enter the **quantity** to sell:`
    );
}

async function handleSaleQuantity(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);

    if (session.data.pendingCheck) {
        if (text.toUpperCase() === 'YES') {
            sessionManager.setData(telegramId, {
                ...session.data,
                pendingCheck: false,
                skipInventory: true
            });
            sessionManager.setState(telegramId, 'SALE_WAITING_QUANTITY');
            await ctx.reply(`Enter the **quantity** to sell:`);
            return;
        } else if (text.toUpperCase() === 'NO') {
            sessionManager.clearSession(telegramId);
            await ctx.reply('❌ Sale cancelled.');
            return;
        } else {
            await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
            return;
        }
    }

    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    if (!session.data.skipInventory && session.data.currentStock < quantity) {
        await ctx.reply(
            `⚠️ Insufficient stock!\n` +
            `Available: ${session.data.currentStock}\n` +
            `Requested: ${quantity}\n\n` +
            `Please enter a lower quantity.`
        );
        return;
    }

    sessionManager.setData(telegramId, { ...session.data, quantity });
    sessionManager.setState(telegramId, 'SALE_WAITING_PRICE');

    await ctx.reply(
        `📦 ${session.data.itemName}\n` +
        `Quantity: **${quantity}**\n\n` +
        `Enter the **unit price** (per item):`
    );
}

async function handleSalePrice(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const price = parseFloat(text);

    if (isNaN(price) || price <= 0) {
        await ctx.reply('⚠️ Please enter a valid price (e.g., 5000).');
        return;
    }

    const total = price * session.data.quantity;

    sessionManager.setData(telegramId, { ...session.data, unitPrice: price, totalPrice: total });
    sessionManager.setState(telegramId, 'SALE_WAITING_CUSTOMER');

    await ctx.reply(
        `📦 ${session.data.itemName}\n` +
        `Quantity: **${session.data.quantity}**\n` +
        `Unit Price: ₦${price.toLocaleString()}\n` +
        `Total: ₦${total.toLocaleString()}\n\n` +
        `Enter the **customer name** (or type "skip"):`
    );
}

async function handleSaleCustomer(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const customer = text.toLowerCase() === 'skip' ? null : text;

    sessionManager.setData(telegramId, { ...session.data, customer });
    sessionManager.setState(telegramId, 'SALE_WAITING_PAYMENT');

    await ctx.reply(
        `👤 Customer: ${customer || 'No customer'}\n` +
        `💰 Total: ₦${session.data.totalPrice.toLocaleString()}\n\n` +
        `**Payment Status:**\n` +
        `1️⃣ PAID - Paid in full\n` +
        `2️⃣ PARTIAL - Paid partially\n` +
        `3️⃣ UNPAID - Not paid yet\n\n` +
        `Reply with **1**, **2**, or **3**:`
    );
}

async function handleSalePayment(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);

    if (text === '1') {
        await completeSale(ctx, telegramId, user, 'PAID', session.data.totalPrice, 0);
    } else if (text === '2') {
        sessionManager.setState(telegramId, 'SALE_WAITING_PARTIAL_AMOUNT');
        await ctx.reply(
            `💰 Enter the **amount paid** by the customer:\n` +
            `Total: ₦${session.data.totalPrice.toLocaleString()}`
        );
    } else if (text === '3') {
        await completeSale(ctx, telegramId, user, 'UNPAID', 0, session.data.totalPrice);
    } else {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
    }
}

async function handlePartialAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const amountPaid = parseFloat(text);

    if (isNaN(amountPaid) || amountPaid <= 0 || amountPaid > session.data.totalPrice) {
        await ctx.reply(
            `⚠️ Please enter a valid amount between 1 and ₦${session.data.totalPrice.toLocaleString()}`
        );
        return;
    }

    const balanceRemaining = session.data.totalPrice - amountPaid;
    await completeSale(ctx, telegramId, user, 'PARTIAL', amountPaid, balanceRemaining);
}

async function completeSale(ctx, telegramId, user, paymentStatus, amountPaid, balanceRemaining) {
    const session = sessionManager.getSession(telegramId);

    try {
        const result = await recordSaleUseCase.execute({
            userId: user.id,
            itemName: session.data.itemName,
            quantity: session.data.quantity,
            unitPrice: session.data.unitPrice,
            customerName: session.data.customer,
            paymentStatus: paymentStatus,
            amountPaid: amountPaid,
            skipInventory: session.data.skipInventory || false,
            inventoryId: session.data.inventoryId || null,
        });

        sessionManager.clearSession(telegramId);

        let message =
            `✅ **Sale Recorded Successfully!**\n\n` +
            `📦 Item: ${session.data.itemName}\n` +
            `🔢 Quantity: ${session.data.quantity}\n` +
            `💰 Total: ₦${session.data.totalPrice.toLocaleString()}\n` +
            `👤 Customer: ${session.data.customer || 'N/A'}\n` +
            `💳 Payment: ${paymentStatus}\n`;

        if (paymentStatus === 'PAID') {
            message += `✅ Paid in full: ₦${amountPaid.toLocaleString()}\n`;
        } else if (paymentStatus === 'PARTIAL') {
            message += `💵 Paid: ₦${amountPaid.toLocaleString()}\n`;
            message += `🔴 Remaining: ₦${balanceRemaining.toLocaleString()}\n`;
            message += `👥 Added to Debtors Register\n`;
        } else {
            message += `🔴 Outstanding: ₦${balanceRemaining.toLocaleString()}\n`;
            message += `👥 Added to Debtors Register\n`;
        }

        message += `\n📊 Use /dashboard to view your business summary.`;

        await ctx.reply(message);

    } catch (error) {
        logger.error('Sale complete error:', error);
        await ctx.reply(`❌ Failed to record sale: ${error.message}`);
    }
}

module.exports = saleHandler;