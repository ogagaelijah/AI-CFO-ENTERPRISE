// src/interfaces/telegram/handlers/saleHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const RecordSaleUseCase = require('../../../application/useCases/sales/RecordSaleUseCase');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const customerRepo = new CustomerRepository();

// ✅ Pass customerRepo to RecordSaleUseCase
const recordSaleUseCase = new RecordSaleUseCase(
    saleRepo, 
    inventoryRepo, 
    debtorRepo, 
    customerRepo
);

async function saleHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        
        console.log('🔍 saleHandler called for telegramId:', telegramId);
        
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        // ✅ Get business for industry and ID
        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;

        let session = sessionManager.getSession(telegramId);
        console.log('🔍 Current session:', session);

        // ✅ If no session or not in sale flow, start the sale flow
        if (!session || !session.state || !session.state.startsWith('SALE_WAITING_')) {
            console.log('🔍 Starting new sale flow');
            await startSaleFlow(ctx, telegramId);
            return;
        }

        const state = session.state;
        const data = session.data || {};

        console.log('🔍 Handling sale state:', state);

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
            case 'SALE_WAITING_CONFIRMATION':
                await handleSaleConfirmation(ctx, telegramId, user, business);
                break;
            default:
                console.log('🔍 Unknown state, starting new sale flow');
                await startSaleFlow(ctx, telegramId);
                break;
        }

    } catch (error) {
        console.error('❌ Sale handler error:', error);
        logger.error('Sale handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function startSaleFlow(ctx, telegramId) {
    console.log('🔍 Creating new sale session');
    sessionManager.createSession(telegramId, 'SALE_WAITING_ITEM', {});
    await ctx.reply(
        `📝 **Record a Sale**\n\n` +
        `Enter the **item name** you are selling.\n\n` +
        `Type /cancel to cancel.`
    );
}

async function handleSaleItem(ctx, telegramId, user) {
    // ✅ Check if this is a text message or callback
    let itemName = '';
    
    if (ctx.message && ctx.message.text) {
        itemName = ctx.message.text.trim();
    } else if (ctx.callbackQuery && ctx.callbackQuery.data) {
        // If it's a callback, we should start the flow
        await startSaleFlow(ctx, telegramId);
        return;
    } else {
        await ctx.reply('Please enter the item name:');
        return;
    }

    const session = sessionManager.getSession(telegramId);

    if (!itemName || itemName.length < 2) {
        await ctx.reply('Please enter a valid item name (at least 2 characters).');
        return;
    }

    // ✅ Check if this is a pending "YES"/"NO" response
    if (session.data.pendingCheck) {
        if (itemName.toUpperCase() === 'YES') {
            // User wants to continue without inventory
            sessionManager.setData(telegramId, {
                ...session.data,
                pendingCheck: false,
                skipInventory: true
            });
            sessionManager.setState(telegramId, 'SALE_WAITING_QUANTITY');
            await ctx.reply(`Enter the **quantity** to sell:`);
            return;
        } else if (itemName.toUpperCase() === 'NO') {
            // User wants to cancel - clear session and return to main menu
            sessionManager.clearSession(telegramId);
            const businesses = await businessRepo.findByUserId(user.id);
            const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;
            const industry = business ? business.industry : 'RETAIL';
            await ctx.reply(`❌ Sale cancelled.\n\n📊 **Main Menu**\n\nSelect an option below:`, { ...getMainMenuKeyboard(industry) });
            return;
        } else {
            await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
            return;
        }
    }

    // ✅ Check if item exists in inventory (CASE-INSENSITIVE)
    const inventoryItem = await inventoryRepo.findByNameIgnoreCase(user.id, itemName);

    if (!inventoryItem) {
        await ctx.reply(
            `⚠️ "${itemName}" not found in inventory.\n\n` +
            `You can still record this sale, but inventory will not be updated.\n` +
            `Continue? Type **YES** or **NO**.`
        );
        // Store the item name and set pendingCheck to true
        sessionManager.setData(telegramId, { 
            ...session.data, 
            itemName, 
            pendingCheck: true,
            skipInventory: false
        });
        // Keep the state as SALE_WAITING_ITEM so the next response is handled correctly
        sessionManager.setState(telegramId, 'SALE_WAITING_ITEM');
        return;
    }

    if (inventoryItem.quantity <= 0) {
        await ctx.reply(
            `⚠️ "${inventoryItem.item_name}" is **out of stock**.\n` +
            `Available: 0\n\n` +
            `Please add stock first using /inventory.`
        );
        // Clear session and return to main menu
        sessionManager.clearSession(telegramId);
        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';
        await ctx.reply(`📊 **Main Menu**\n\nSelect an option below:`, { ...getMainMenuKeyboard(industry) });
        return;
    }

    sessionManager.setData(telegramId, {
        ...session.data,
        itemName: inventoryItem.item_name, // Use the actual item name from DB
        inventoryId: inventoryItem.id,
        currentStock: inventoryItem.quantity,
        pendingCheck: false
    });
    sessionManager.setState(telegramId, 'SALE_WAITING_QUANTITY');

    await ctx.reply(
        `📦 **${inventoryItem.item_name}**\n` +
        `Available stock: **${inventoryItem.quantity}** units\n\n` +
        `Enter the **quantity** to sell:`
    );
}

async function handleSaleQuantity(ctx, telegramId, user) {
    // ✅ Check if this is a text message
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim();
    } else {
        await ctx.reply('Please enter the quantity:');
        return;
    }

    const session = sessionManager.getSession(telegramId);

    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    // Check if quantity exceeds stock (if not skipping)
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
    // ✅ Check if this is a text message
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim().replace(/,/g, '');
    } else {
        await ctx.reply('Please enter the unit price:');
        return;
    }

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
    // ✅ Check if this is a text message
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim();
    } else {
        await ctx.reply('Please enter the customer name (or type "skip"):');
        return;
    }

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
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim();
    } else if (ctx.callbackQuery && ctx.callbackQuery.data) {
        text = ctx.callbackQuery.data;
    } else {
        const session = sessionManager.getSession(telegramId);
        await ctx.reply(
            `💳 **Payment Status:**\n` +
            `1️⃣ PAID - Paid in full\n` +
            `2️⃣ PARTIAL - Paid partially\n` +
            `3️⃣ UNPAID - Not paid yet\n\n` +
            `Reply with **1**, **2**, or **3**:`
        );
        return;
    }

    const session = sessionManager.getSession(telegramId);

    if (text === '1') {
        await showSaleConfirmation(ctx, telegramId, user, 'PAID', session.data.totalPrice, 0);
    } else if (text === '2') {
        sessionManager.setState(telegramId, 'SALE_WAITING_PARTIAL_AMOUNT');
        await ctx.reply(
            `💰 Enter the **amount paid** by the customer:\n` +
            `Total: ₦${session.data.totalPrice.toLocaleString()}`
        );
    } else if (text === '3') {
        await showSaleConfirmation(ctx, telegramId, user, 'UNPAID', 0, session.data.totalPrice);
    } else {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
    }
}

async function handlePartialAmount(ctx, telegramId, user) {
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim().replace(/,/g, '');
    } else {
        const session = sessionManager.getSession(telegramId);
        await ctx.reply(
            `💰 Enter the **amount paid** by the customer:\n` +
            `Total: ₦${session.data.totalPrice.toLocaleString()}`
        );
        return;
    }

    const session = sessionManager.getSession(telegramId);
    const amountPaid = parseFloat(text);

    if (isNaN(amountPaid) || amountPaid <= 0 || amountPaid > session.data.totalPrice) {
        await ctx.reply(
            `⚠️ Please enter a valid amount between 1 and ₦${session.data.totalPrice.toLocaleString()}`
        );
        return;
    }

    const balanceRemaining = session.data.totalPrice - amountPaid;
    await showSaleConfirmation(ctx, telegramId, user, 'PARTIAL', amountPaid, balanceRemaining);
}

async function showSaleConfirmation(ctx, telegramId, user, paymentStatus, amountPaid, balanceRemaining) {
    const session = sessionManager.getSession(telegramId);

    let message =
        `📋 **Confirm Sale Details**\n\n` +
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
    } else {
        message += `🔴 Outstanding: ₦${balanceRemaining.toLocaleString()}\n`;
    }

    message += `\nReply with **YES** to confirm or **NO** to cancel.`;

    sessionManager.setData(telegramId, {
        ...session.data,
        paymentStatus,
        amountPaid,
        balanceRemaining,
        pendingAction: 'record_sale'
    });
    sessionManager.setState(telegramId, 'SALE_WAITING_CONFIRMATION');

    await ctx.reply(message);
}

async function handleSaleConfirmation(ctx, telegramId, user, business) {
    let text = '';
    
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim().toUpperCase();
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        try {
            // ✅ Get business ID
            const businessId = business ? business.id : null;

            const result = await recordSaleUseCase.execute({
                userId: user.id,
                businessId: businessId,
                itemName: session.data.itemName,
                quantity: session.data.quantity,
                unitPrice: session.data.unitPrice,
                customerName: session.data.customer,
                paymentStatus: session.data.paymentStatus,
                amountPaid: session.data.amountPaid,
                skipInventory: session.data.skipInventory || false,
                inventoryId: session.data.inventoryId || null,
            });

            sessionManager.clearSession(telegramId);

            const industry = business ? business.industry : 'RETAIL';

            let message =
                `✅ **Sale Recorded Successfully!**\n\n` +
                `📦 Item: ${session.data.itemName}\n` +
                `🔢 Quantity: ${session.data.quantity}\n` +
                `💰 Total: ₦${session.data.totalPrice.toLocaleString()}\n` +
                `👤 Customer: ${session.data.customer || 'N/A'}\n` +
                `💳 Payment: ${session.data.paymentStatus}\n`;

            if (session.data.paymentStatus === 'PAID') {
                message += `✅ Paid in full: ₦${session.data.amountPaid.toLocaleString()}\n`;
            } else if (session.data.paymentStatus === 'PARTIAL') {
                message += `💵 Paid: ₦${session.data.amountPaid.toLocaleString()}\n`;
                message += `🔴 Remaining: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
                message += `👥 Added to Debtors Register\n`;
            } else {
                message += `🔴 Outstanding: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
                message += `👥 Added to Debtors Register\n`;
            }

            if (result.customerId && session.data.customer) {
                message += `👤 Customer linked: ${session.data.customer} (ID: ${result.customerId})\n`;
            }

            message += `\n📊 **Select an option below to continue:**`;

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard(industry)
            });

        } catch (error) {
            console.error('❌ Sale complete error:', error);
            await ctx.reply(`❌ Failed to record sale: ${error.message}`);
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        const industry = business ? business.industry : 'RETAIL';
        await ctx.reply(
            `❌ **Sale Cancelled.**\n\n📊 **Main Menu**\n\nSelect an option below:`,
            { ...getMainMenuKeyboard(industry) }
        );
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

module.exports = saleHandler;