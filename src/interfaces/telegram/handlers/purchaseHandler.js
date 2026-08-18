// src/interfaces/telegram/handlers/purchaseHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const { getPurchaseKeyboard, getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const inventoryRepo = new InventoryRepository();
const purchaseRepo = new PurchaseRepository();
const creditorRepo = new CreditorRepository();

async function purchaseHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        if (!state || !state.startsWith('PURCHASE_')) {
            await showPurchaseMenu(ctx, telegramId, user);
            return;
        }

        switch (state) {
            case 'PURCHASE_WAITING_ITEM':
                await handlePurchaseItem(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_QUANTITY':
                await handlePurchaseQuantity(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_COST':
                await handlePurchaseCost(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_SELLING_PRICE':
                await handlePurchaseSellingPrice(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_SUPPLIER':
                await handlePurchaseSupplier(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_PAYMENT':
                await handlePurchasePayment(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_PARTIAL_AMOUNT':
                await handlePurchasePartialAmount(ctx, telegramId, user);
                break;
            case 'PURCHASE_WAITING_CONFIRMATION':
                await handlePurchaseConfirmation(ctx, telegramId, user);
                break;
            default:
                await showPurchaseMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Purchase handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

// =============================================
// SHOW PURCHASE MENU
// =============================================
async function showPurchaseMenu(ctx, telegramId, user) {
    const purchaseSummary = await purchaseRepo.getPurchaseSummary(user.id);
    const todayPurchases = await purchaseRepo.getTodayPurchases(user.id);

    let message =
        `🛒 **Purchase Management**\n\n` +
        `📊 **Summary**\n` +
        `• Total Purchases: ${purchaseSummary.total_purchases || 0}\n` +
        `• Total Amount: ₦${(purchaseSummary.total_amount || 0).toLocaleString()}\n` +
        `• Today: ${todayPurchases.length} purchases\n\n` +
        `Select an option below:`;

    const keyboard = getPurchaseKeyboard();

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

// =============================================
// RECORD PURCHASE FLOW
// =============================================
async function startPurchaseFlow(ctx, telegramId) {
    sessionManager.createSession(telegramId, 'PURCHASE_WAITING_ITEM', {});
    await ctx.reply(
        `🛒 **Record Purchase**\n\n` +
        `Enter the **item name** you purchased:\n` +
        `(e.g., "Rice 50kg", "Raw Materials")\n\n` +
        `Type /cancel to cancel.`
    );
}

async function handlePurchaseItem(ctx, telegramId, user) {
    const itemName = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);

    if (!itemName || itemName.length < 2) {
        await ctx.reply('Please enter a valid item name (at least 2 characters).');
        return;
    }

    sessionManager.setData(telegramId, { ...session.data, itemName });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_QUANTITY');

    await ctx.reply(
        `📦 **${itemName}**\n\n` +
        `Enter the **quantity** purchased:`
    );
}

async function handlePurchaseQuantity(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const quantity = parseInt(text);

    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    sessionManager.setData(telegramId, { ...session.data, quantity });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_COST');

    await ctx.reply(
        `📦 ${session.data.itemName}\n` +
        `Quantity: **${quantity}**\n\n` +
        `Enter the **unit cost** (price per unit):`
    );
}

async function handlePurchaseCost(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const unitCost = parseFloat(text);

    if (isNaN(unitCost) || unitCost <= 0) {
        await ctx.reply('⚠️ Please enter a valid unit cost (e.g., 5000).');
        return;
    }

    const totalCost = unitCost * session.data.quantity;

    sessionManager.setData(telegramId, { ...session.data, unitCost, totalCost });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_SELLING_PRICE');

    const existingItem = await inventoryRepo.findByName(user.id, session.data.itemName);
    let message = `📦 ${session.data.itemName}\n` +
        `Quantity: **${session.data.quantity}**\n` +
        `Unit Cost: ₦${unitCost.toLocaleString()}\n` +
        `Total Cost: ₦${totalCost.toLocaleString()}\n\n`;

    if (existingItem && existingItem.selling_price > 0) {
        message += `💰 Current Selling Price: ₦${existingItem.selling_price.toLocaleString()}\n`;
        message += `📈 Current Profit per unit: ₦${(existingItem.selling_price - unitCost).toLocaleString()}\n\n`;
        message += `Enter the **selling price** (or type "keep" to keep current):`;
    } else {
        message += `Enter the **selling price** (or type "skip"):`;
    }

    await ctx.reply(message);
}

async function handlePurchaseSellingPrice(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);

    let sellingPrice = 0;
    
    if (text.toLowerCase() === 'keep' || text.toLowerCase() === 'skip') {
        const existingItem = await inventoryRepo.findByName(user.id, session.data.itemName);
        if (existingItem && existingItem.selling_price > 0) {
            sellingPrice = existingItem.selling_price;
        } else {
            sellingPrice = 0;
        }
    } else {
        sellingPrice = parseFloat(text);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
            await ctx.reply('⚠️ Please enter a valid selling price (e.g., 7000) or type "skip".');
            return;
        }
    }

    sessionManager.setData(telegramId, { ...session.data, sellingPrice });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_SUPPLIER');

    const profit = sellingPrice - session.data.unitCost;
    const profitMargin = session.data.unitCost > 0 ? ((profit / session.data.unitCost) * 100).toFixed(1) : 0;

    let message = `📦 ${session.data.itemName}\n` +
        `Quantity: **${session.data.quantity}**\n` +
        `Unit Cost: ₦${session.data.unitCost.toLocaleString()}\n` +
        `Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
        `💲 Selling Price: ₦${sellingPrice.toLocaleString()}\n`;

    if (profit > 0) {
        message += `📈 Profit per unit: ₦${profit.toLocaleString()} (${profitMargin}% margin)\n\n`;
    } else if (profit === 0) {
        message += `📈 No profit (selling at cost)\n\n`;
    } else {
        message += `⚠️ Loss per unit: ₦${Math.abs(profit).toLocaleString()}\n\n`;
    }

    message += `Enter the **supplier name** (or type "skip"):`;

    await ctx.reply(message);
}

async function handlePurchaseSupplier(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const supplier = text.toLowerCase() === 'skip' ? null : text;

    sessionManager.setData(telegramId, { ...session.data, supplier });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_PAYMENT');

    await ctx.reply(
        `🏢 Supplier: ${supplier || 'No supplier'}\n` +
        `💰 Total: ₦${session.data.totalCost.toLocaleString()}\n\n` +
        `**Payment Status:**\n` +
        `1️⃣ PAID - Paid in full\n` +
        `2️⃣ PARTIAL - Paid partially\n` +
        `3️⃣ UNPAID - Not paid yet\n\n` +
        `Reply with **1**, **2**, or **3**:`
    );
}

async function handlePurchasePayment(ctx, telegramId, user) {
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);

    if (text === '1') {
        await showPurchaseConfirmation(ctx, telegramId, user, 'PAID', session.data.totalCost, 0);
    } else if (text === '2') {
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_PARTIAL_AMOUNT');
        await ctx.reply(
            `💰 Enter the **amount paid** to supplier:\n` +
            `Total: ₦${session.data.totalCost.toLocaleString()}`
        );
    } else if (text === '3') {
        await showPurchaseConfirmation(ctx, telegramId, user, 'UNPAID', 0, session.data.totalCost);
    } else {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
    }
}

async function handlePurchasePartialAmount(ctx, telegramId, user) {
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const amountPaid = parseFloat(text);

    if (isNaN(amountPaid) || amountPaid <= 0 || amountPaid > session.data.totalCost) {
        await ctx.reply(
            `⚠️ Please enter a valid amount between 1 and ₦${session.data.totalCost.toLocaleString()}`
        );
        return;
    }

    const balanceRemaining = session.data.totalCost - amountPaid;
    await showPurchaseConfirmation(ctx, telegramId, user, 'PARTIAL', amountPaid, balanceRemaining);
}

async function showPurchaseConfirmation(ctx, telegramId, user, paymentStatus, amountPaid, balanceRemaining) {
    const session = sessionManager.getSession(telegramId);

    sessionManager.setData(telegramId, {
        ...session.data,
        paymentStatus,
        amountPaid,
        balanceRemaining,
        pendingAction: 'record_purchase'
    });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_CONFIRMATION');

    let message =
        `📋 **Confirm Purchase Details**\n\n` +
        `📦 Item: ${session.data.itemName}\n` +
        `🔢 Quantity: ${session.data.quantity}\n` +
        `💰 Unit Cost: ₦${session.data.unitCost.toLocaleString()}\n` +
        `💵 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
        `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()}\n` +
        `🏢 Supplier: ${session.data.supplier || 'N/A'}\n` +
        `💳 Payment: ${paymentStatus}\n`;

    if (paymentStatus === 'PAID') {
        message += `✅ Paid in full: ₦${amountPaid.toLocaleString()}\n`;
    } else if (paymentStatus === 'PARTIAL') {
        message += `💵 Paid: ₦${amountPaid.toLocaleString()}\n`;
        message += `🔴 Remaining: ₦${balanceRemaining.toLocaleString()}\n`;
        message += `🏦 Will be added to Creditors\n`;
    } else {
        message += `🔴 Outstanding: ₦${balanceRemaining.toLocaleString()}\n`;
        message += `🏦 Will be added to Creditors\n`;
    }

    message += `\nReply with **YES** to confirm or **NO** to cancel.`;

    await ctx.reply(message);
}

async function handlePurchaseConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        try {
            await purchaseRepo.create({
                user_id: user.id,
                item_name: session.data.itemName,
                quantity: session.data.quantity,
                unit_cost: session.data.unitCost,
                total_cost: session.data.totalCost,
                supplier_name: session.data.supplier,
            });

            const existingItem = await inventoryRepo.findByName(user.id, session.data.itemName);
            if (existingItem) {
                const totalQuantity = existingItem.quantity + session.data.quantity;
                const totalCost = (existingItem.quantity * existingItem.cost_price) + session.data.totalCost;
                const avgCost = totalCost / totalQuantity;
                
                const newSellingPrice = session.data.sellingPrice > 0 ? session.data.sellingPrice : existingItem.selling_price;
                
                await inventoryRepo.update(existingItem.id, {
                    quantity: totalQuantity,
                    cost_price: avgCost,
                    selling_price: newSellingPrice,
                });
            } else {
                await inventoryRepo.create({
                    user_id: user.id,
                    item_name: session.data.itemName,
                    quantity: session.data.quantity,
                    cost_price: session.data.unitCost,
                    selling_price: session.data.sellingPrice || 0,
                });
            }

            if (session.data.paymentStatus !== 'PAID' && session.data.supplier) {
                const existingCreditors = await creditorRepo.findBySupplierName(user.id, session.data.supplier);
                const existingActive = existingCreditors.filter(c => c.balance_remaining > 0);
                
                if (existingActive.length > 0) {
                    const creditor = existingActive[0];
                    const newTotalOwed = creditor.total_owed + session.data.balanceRemaining;
                    const newBalance = creditor.balance_remaining + session.data.balanceRemaining;
                    
                    await creditorRepo.update(creditor.id, {
                        total_owed: newTotalOwed,
                        balance_remaining: newBalance,
                        amount_paid: creditor.amount_paid,
                        status: 'ACTIVE',
                    });
                } else {
                    await creditorRepo.create({
                        user_id: user.id,
                        supplier_name: session.data.supplier,
                        total_owed: session.data.totalCost,
                        amount_paid: session.data.amountPaid || 0,
                        balance_remaining: session.data.balanceRemaining,
                        status: 'ACTIVE',
                        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    });
                }
            }

            sessionManager.clearSession(telegramId);

            const businesses = await new (require('../../../infrastructure/database/sqlite/repositories/BusinessRepository'))().findByUserId(user.id);
            const business = businesses.length > 0 ? businesses[0] : null;
            const industry = business ? business.industry : 'RETAIL';

            const profit = session.data.sellingPrice - session.data.unitCost;
            const profitMargin = session.data.unitCost > 0 ? ((profit / session.data.unitCost) * 100).toFixed(1) : 0;

            let message =
                `✅ **Purchase Recorded Successfully!**\n\n` +
                `📦 Item: ${session.data.itemName}\n` +
                `🔢 Quantity: ${session.data.quantity}\n` +
                `💰 Unit Cost: ₦${session.data.unitCost.toLocaleString()}\n` +
                `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()}\n` +
                `💵 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
                `🏢 Supplier: ${session.data.supplier || 'N/A'}\n` +
                `💳 Payment: ${session.data.paymentStatus}\n`;

            if (profit > 0) {
                message += `📈 Profit per unit: ₦${profit.toLocaleString()} (${profitMargin}% margin)\n`;
            } else if (profit === 0) {
                message += `📈 No profit (selling at cost)\n`;
            } else {
                message += `⚠️ Loss per unit: ₦${Math.abs(profit).toLocaleString()}\n`;
            }

            if (session.data.paymentStatus === 'PAID') {
                message += `✅ Paid in full: ₦${session.data.amountPaid.toLocaleString()}\n`;
            } else if (session.data.paymentStatus === 'PARTIAL') {
                message += `💵 Paid: ₦${session.data.amountPaid.toLocaleString()}\n`;
                message += `🔴 Remaining: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
                message += `🏦 Added to Creditors Register\n`;
            } else {
                message += `🔴 Outstanding: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
                message += `🏦 Added to Creditors Register\n`;
            }

            message += `\n📦 **Inventory Updated!**\n` +
                `✅ Stock added to inventory.\n\n` +
                `📊 **Select an option below to continue:**`;

            await ctx.reply(message, { ...getMainMenuKeyboard(industry) });

        } catch (error) {
            logger.error('Purchase save error:', error);
            await ctx.reply(`❌ Failed to record purchase: ${error.message}`);
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        const businesses = await new (require('../../../infrastructure/database/sqlite/repositories/BusinessRepository'))().findByUserId(user.id);
        const business = businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';
        await ctx.reply(
            `❌ **Purchase Cancelled.**\n\n📊 **Main Menu**\n\nSelect an option below:`,
            { ...getMainMenuKeyboard(industry) }
        );
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

// =============================================
// VIEW ALL PURCHASES
// =============================================
async function listPurchases(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const purchases = await purchaseRepo.findByUserId(user.id);

    if (purchases.length === 0) {
        await ctx.reply('📋 **No purchase records found.**');
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
        return;
    }

    let message = `🛒 **All Purchase Records**\n\n`;
    for (const purchase of purchases.slice(0, 15)) {
        message += `📦 ${purchase.item_name}\n`;
        message += `   🔢 ${purchase.quantity} units @ ₦${purchase.unit_cost.toLocaleString()}\n`;
        message += `   💰 Total: ₦${purchase.total_cost.toLocaleString()}\n`;
        message += `   🏢 ${purchase.supplier_name || 'N/A'}\n`;
        message += `   📅 ${new Date(purchase.purchase_date).toLocaleDateString()}\n\n`;
    }
    if (purchases.length > 15) {
        message += `... and ${purchases.length - 15} more.`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
}

// =============================================
// PURCHASE SUMMARY
// =============================================
async function purchaseSummary(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const summary = await purchaseRepo.getPurchaseSummary(user.id);

    await ctx.reply(
        `📊 **Purchase Summary**\n\n` +
        `📝 Total Purchases: ${summary.total_purchases || 0}\n` +
        `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
        `📦 Total Items: ${summary.total_items || 0}\n` +
        `📊 Average Purchase: ₦${(summary.average_purchase || 0).toLocaleString()}\n` +
        `🏢 Suppliers: ${summary.suppliers_used || 0}`
    );

    await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
}

// =============================================
// TODAY'S PURCHASES
// =============================================
async function purchaseToday(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const todayPurchases = await purchaseRepo.getTodayPurchases(user.id);

    if (todayPurchases.length === 0) {
        await ctx.reply('📅 **No purchases recorded today.**');
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
        return;
    }

    let message = `📅 **Today's Purchases**\n\n`;
    for (const purchase of todayPurchases) {
        message += `📦 ${purchase.item_name}\n`;
        message += `   🔢 ${purchase.quantity} units\n`;
        message += `   💰 ₦${purchase.total_cost.toLocaleString()}\n\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
}

module.exports = {
    purchaseHandler,
    startPurchaseFlow,
    listPurchases,
    purchaseSummary,
    purchaseToday,
};