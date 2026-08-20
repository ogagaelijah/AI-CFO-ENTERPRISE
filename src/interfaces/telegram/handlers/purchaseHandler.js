// src/interfaces/telegram/handlers/purchaseHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const InventoryTransactionRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryTransactionRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const RecordPurchaseUseCase = require('../../../application/useCases/purchases/RecordPurchaseUseCase');
const { getMainMenuKeyboard, getPurchaseKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const purchaseRepo = new PurchaseRepository();
const inventoryRepo = new InventoryRepository();
const inventoryTransactionRepo = new InventoryTransactionRepository();
const creditorRepo = new CreditorRepository();
const supplierRepo = new SupplierRepository();

const recordPurchaseUseCase = new RecordPurchaseUseCase({
    purchaseRepository: purchaseRepo,
    transactionRepository: null,
    inventoryRepository: inventoryRepo,
    inventoryTransactionRepository: inventoryTransactionRepo,
    creditorRepository: creditorRepo,
    supplierRepository: supplierRepo,
});

async function purchaseHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        console.log('🔍 [purchaseHandler] Started for:', telegramId);

        const user = await userRepo.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const businesses = await businessRepo.findByUserId(user.id);
        let business = null;
        if (Array.isArray(businesses) && businesses.length > 0) {
            business = businesses[0];
        } else if (businesses && !Array.isArray(businesses)) {
            business = businesses;
        }

        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        const businessId = business.id;

        if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;
            console.log('🔍 [purchaseHandler] Callback query:', data);
            await ctx.answerCbQuery();

            if (data === 'menu_purchase') {
                await showPurchaseMenu(ctx, telegramId);
                return;
            }

            await handleButtonClick(ctx, businessId, telegramId, user.id);
            return;
        }

        const session = sessionManager.getSession(telegramId);
        const state = session ? session.state : null;
        console.log('🔍 [purchaseHandler] State:', state);

        switch (state) {
            case 'PURCHASE_WAITING_ITEM':
                await handlePurchaseItem(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_QUANTITY':
                await handlePurchaseQuantity(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_UNIT_COST':
                await handlePurchaseUnitCost(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_SELLING_PRICE':
                await handlePurchaseSellingPrice(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_SUPPLIER':
                await handlePurchaseSupplier(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_PAYMENT':
                await handlePurchasePayment(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_PARTIAL_AMOUNT':
                await handlePurchasePartialAmount(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_CONFIRMATION':
                await handlePurchaseConfirmation(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_DELETE_ID':
                await handlePurchaseDeleteId(ctx, businessId, telegramId, user.id);
                break;
            case 'PURCHASE_WAITING_DELETE_CONFIRM':
                await handlePurchaseDeleteConfirm(ctx, businessId, telegramId, user.id);
                break;
            default:
                await showPurchaseMenu(ctx, telegramId);
                break;
        }

    } catch (error) {
        console.error('❌ Purchase handler error:', error);
        logger.error('Purchase handler error:', error);
        sessionManager.clearSession(ctx.from.id);
        await ctx.reply('❌ Something went wrong. Please try again.');
        await showPurchaseMenu(ctx, ctx.from.id);
    }
}

async function showPurchaseMenu(ctx, telegramId) {
    sessionManager.clearSession(telegramId);
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 Record Purchase', callback_data: 'purchase_add' }],
                [{ text: '📋 List All', callback_data: 'purchase_list' }],
                [{ text: '📊 Summary', callback_data: 'purchase_summary' }],
                [{ text: '📈 Today', callback_data: 'purchase_today' }],
                [{ text: '🗑️ Delete', callback_data: 'purchase_delete' }],
                [{ text: '🔙 Back', callback_data: 'menu_back' }],
            ],
        },
    };

    await ctx.reply(
        `🛒 **Purchase Management**

Record purchases from suppliers.

• **Record Purchase** — Add a new purchase
• **List All** — View all purchases
• **Summary** — Purchase statistics
• **Today** — Today's purchases
• **Delete** — Remove a purchase

Select an option below:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handlePurchaseItem(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;

    if (!text) {
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_ITEM');
        await ctx.reply(
            `🛒 **Record Purchase**

Enter the **item name**:`
        );
        return;
    }

    const itemName = text.trim();
    if (itemName.length < 2) {
        await ctx.reply('⚠️ Please enter a valid item name (at least 2 characters).');
        return;
    }

    sessionManager.setData(telegramId, { itemName });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_QUANTITY');

    await ctx.reply(
        `📦 **Item:** ${itemName}\n\n` +
        `Enter the **quantity** purchased:`
    );
}

async function handlePurchaseQuantity(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('Please enter the quantity:');
        return;
    }

    const quantity = parseInt(text.trim());
    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    sessionManager.setData(telegramId, { ...session.data, quantity });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_UNIT_COST');

    await ctx.reply(
        `📦 **Item:** ${session.data.itemName}\n` +
        `🔢 **Quantity:** ${quantity}\n\n` +
        `Enter the **unit cost** (what you paid per item):`
    );
}

async function handlePurchaseUnitCost(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('Please enter the unit cost:');
        return;
    }

    const unitCost = parseFloat(text.trim().replace(/,/g, ''));
    if (isNaN(unitCost) || unitCost <= 0) {
        await ctx.reply('⚠️ Please enter a valid cost (e.g., 5000).');
        return;
    }

    const totalCost = session.data.quantity * unitCost;

    sessionManager.setData(telegramId, { ...session.data, unitCost, totalCost });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_SELLING_PRICE');

    await ctx.reply(
        `📦 **Item:** ${session.data.itemName}\n` +
        `🔢 **Quantity:** ${session.data.quantity}\n` +
        `💰 **Unit Cost:** ₦${unitCost.toLocaleString()}\n` +
        `💵 **Total Cost:** ₦${totalCost.toLocaleString()}\n\n` +
        `Enter the **selling price** (what you will sell for):`
    );
}

async function handlePurchaseSellingPrice(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('Please enter the selling price:');
        return;
    }

    const sellingPrice = parseFloat(text.trim().replace(/,/g, ''));
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
        await ctx.reply('⚠️ Please enter a valid selling price.');
        return;
    }

    const totalSelling = session.data.quantity * sellingPrice;
    const profitPerUnit = sellingPrice - session.data.unitCost;
    const totalProfit = profitPerUnit * session.data.quantity;
    const profitMargin = session.data.unitCost > 0 ? ((profitPerUnit / session.data.unitCost) * 100).toFixed(1) : 0;

    sessionManager.setData(telegramId, { 
        ...session.data, 
        sellingPrice, 
        totalSelling,
        profitPerUnit,
        totalProfit,
        profitMargin
    });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_SUPPLIER');

    await ctx.reply(
        `📦 **Item:** ${session.data.itemName}\n` +
        `🔢 **Quantity:** ${session.data.quantity}\n` +
        `💰 **Unit Cost:** ₦${session.data.unitCost.toLocaleString()}\n` +
        `💲 **Selling Price:** ₦${sellingPrice.toLocaleString()}\n` +
        `💵 **Total Cost:** ₦${session.data.totalCost.toLocaleString()}\n` +
        `💲 **Total Selling:** ₦${totalSelling.toLocaleString()}\n` +
        `📈 **Profit per unit:** ₦${profitPerUnit.toLocaleString()} (${profitMargin}% margin)\n\n` +
        `Enter the **supplier name** (or type "skip"):`
    );
}

async function handlePurchaseSupplier(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('Please enter the supplier name (or type "skip"):');
        return;
    }

    const supplierName = text.trim().toLowerCase() === 'skip' ? null : text.trim();

    sessionManager.setData(telegramId, { ...session.data, supplierName });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_PAYMENT');

    await ctx.reply(
        `📦 **Item:** ${session.data.itemName}\n` +
        `🔢 **Quantity:** ${session.data.quantity}\n` +
        `💰 **Unit Cost:** ₦${session.data.unitCost.toLocaleString()}\n` +
        `💲 **Selling Price:** ₦${session.data.sellingPrice.toLocaleString()}\n` +
        `💵 **Total Cost:** ₦${session.data.totalCost.toLocaleString()}\n` +
        `🏢 **Supplier:** ${supplierName || 'N/A'}\n\n` +
        `**Payment Status:**\n` +
        `1️⃣ PAID - Paid in full\n` +
        `2️⃣ PARTIAL - Paid partially\n` +
        `3️⃣ UNPAID - Not paid yet\n\n` +
        `Reply with **1**, **2**, or **3**:`
    );
}

async function handlePurchasePayment(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
        return;
    }

    const choice = text.trim();

    if (choice === '1') {
        sessionManager.setData(telegramId, { 
            ...session.data, 
            paymentStatus: 'PAID',
            amountPaid: session.data.totalCost,
            balanceRemaining: 0,
        });
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_CONFIRMATION');
        await showPurchaseConfirmation(ctx, telegramId);
        
    } else if (choice === '2') {
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_PARTIAL_AMOUNT');
        await ctx.reply(
            `💰 Enter the **amount paid**:\n` +
            `Total: ₦${session.data.totalCost.toLocaleString()}`
        );
        
    } else if (choice === '3') {
        sessionManager.setData(telegramId, { 
            ...session.data, 
            paymentStatus: 'UNPAID',
            amountPaid: 0,
            balanceRemaining: session.data.totalCost,
        });
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_CONFIRMATION');
        await showPurchaseConfirmation(ctx, telegramId);
        
    } else {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
    }
}

async function handlePurchasePartialAmount(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply(`💰 Enter the **amount paid**:\nTotal: ₦${session.data.totalCost.toLocaleString()}`);
        return;
    }

    const amountPaid = parseFloat(text.trim().replace(/,/g, ''));
    if (isNaN(amountPaid) || amountPaid <= 0 || amountPaid > session.data.totalCost) {
        await ctx.reply(`⚠️ Please enter a valid amount between 1 and ₦${session.data.totalCost.toLocaleString()}`);
        return;
    }

    sessionManager.setData(telegramId, { 
        ...session.data, 
        paymentStatus: 'PARTIAL',
        amountPaid: amountPaid,
        balanceRemaining: session.data.totalCost - amountPaid,
    });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_CONFIRMATION');
    await showPurchaseConfirmation(ctx, telegramId);
}

async function showPurchaseConfirmation(ctx, telegramId) {
    const session = sessionManager.getSession(telegramId);

    let message =
        `📋 **Confirm Purchase Details**\n\n` +
        `📦 Item: ${session.data.itemName}\n` +
        `🔢 Quantity: ${session.data.quantity}\n` +
        `💰 Unit Cost: ₦${session.data.unitCost.toLocaleString()}\n` +
        `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()}\n` +
        `💵 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
        `🏢 Supplier: ${session.data.supplierName || 'N/A'}\n` +
        `💳 Payment: ${session.data.paymentStatus}\n`;

    if (session.data.paymentStatus === 'PAID') {
        message += `✅ Paid in full: ₦${session.data.totalCost.toLocaleString()}\n`;
    } else if (session.data.paymentStatus === 'PARTIAL') {
        message += `💵 Paid: ₦${session.data.amountPaid.toLocaleString()}\n`;
        message += `🔴 Remaining: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
    } else {
        message += `🔴 Outstanding: ₦${session.data.totalCost.toLocaleString()}\n`;
    }

    message += `\nReply with **YES** to confirm or **NO** to cancel.`;

    sessionManager.setData(telegramId, { ...session.data, pendingAction: 'record_purchase' });
    await ctx.reply(message);
}

async function handlePurchaseConfirmation(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    const response = text.trim().toUpperCase();

    if (response === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply('❌ Purchase cancelled.');
        await showPurchaseMenu(ctx, telegramId);
        return;
    }

    if (response !== 'YES') {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    try {
        const result = await recordPurchaseUseCase.execute({
            userId: userId,
            businessId: businessId,
            supplierName: session.data.supplierName,
            itemName: session.data.itemName,
            quantity: session.data.quantity,
            unitCost: session.data.unitCost,
            sellingPrice: session.data.sellingPrice,
            totalCost: session.data.totalCost,
            paymentStatus: session.data.paymentStatus,
            amountPaid: session.data.amountPaid || 0,
            dueDate: null,
            notes: '',
            purchaseDate: new Date(),
        });

        sessionManager.clearSession(telegramId);

        const businesses = await businessRepo.findByUserId(userId);
        const business = businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';

        let message =
            `✅ **Purchase Recorded Successfully!**\n\n` +
            `📦 Item: ${session.data.itemName}\n` +
            `🔢 Quantity: ${session.data.quantity}\n` +
            `💰 Unit Cost: ₦${session.data.unitCost.toLocaleString()}\n` +
            `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()}\n` +
            `💵 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
            `🏢 Supplier: ${session.data.supplierName || 'N/A'}\n` +
            `💳 Payment: ${session.data.paymentStatus}\n`;

        if (session.data.paymentStatus === 'PAID') {
            message += `✅ Paid in full: ₦${session.data.totalCost.toLocaleString()}\n`;
        } else if (session.data.paymentStatus === 'PARTIAL') {
            message += `💵 Paid: ₦${session.data.amountPaid.toLocaleString()}\n`;
            message += `🔴 Remaining: ₦${session.data.balanceRemaining.toLocaleString()}\n`;
            message += `🏦 Added to Creditors Register\n`;
        } else {
            message += `🔴 Outstanding: ₦${session.data.totalCost.toLocaleString()}\n`;
            message += `🏦 Added to Creditors Register\n`;
        }

        if (result.supplierCreated && session.data.supplierName) {
            message += `👤 Supplier linked: ${session.data.supplierName} (ID: ${result.supplierId})\n`;
        }

        if (session.data.profitPerUnit && session.data.profitPerUnit > 0) {
            message += `📈 Profit per unit: ₦${session.data.profitPerUnit.toLocaleString()} (${session.data.profitMargin}% margin)\n`;
        }

        message += `\n📊 **Inventory Updated!**\n✅ Stock added to inventory.\n\n📊 **Select an option below to continue:**`;

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard(industry)
        });

    } catch (error) {
        console.error('❌ Purchase confirmation error:', error);
        sessionManager.clearSession(telegramId);
        await ctx.reply(`❌ Failed to record purchase: ${error.message}`);
        await showPurchaseMenu(ctx, telegramId);
    }
}

// =============================================
// DELETE PURCHASE FLOW
// =============================================
async function handlePurchaseDeleteId(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;

    if (!text) {
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_DELETE_ID');
        await ctx.reply(
            `🗑️ **Delete Purchase**

Enter the purchase ID to delete:`
        );
        return;
    }

    const purchaseId = parseInt(text.trim());
    if (isNaN(purchaseId) || purchaseId <= 0) {
        await ctx.reply('⚠️ Please enter a valid purchase ID.');
        return;
    }

    const purchase = await purchaseRepo.findById(purchaseId);
    if (!purchase || purchase.user_id !== userId) {
        await ctx.reply('❌ Purchase not found.');
        await showPurchaseMenu(ctx, telegramId);
        return;
    }

    sessionManager.setData(telegramId, { purchaseId, purchase });
    sessionManager.setState(telegramId, 'PURCHASE_WAITING_DELETE_CONFIRM');

    await ctx.reply(
        `⚠️ **Confirm Delete**

Are you sure you want to delete this purchase?

📦 Item: ${purchase.item_name}
🔢 Quantity: ${purchase.quantity}
💰 Unit Cost: ₦${purchase.unit_cost.toLocaleString()}
💵 Total Cost: ₦${purchase.total_cost.toLocaleString()}
🏢 Supplier: ${purchase.supplier_name || 'N/A'}

Reply with **YES** to confirm or **NO** to cancel.`
    );
}

async function handlePurchaseDeleteConfirm(ctx, businessId, telegramId, userId) {
    const text = ctx.message?.text;
    const session = sessionManager.getSession(telegramId);

    if (!text) {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    const response = text.trim().toUpperCase();

    if (response === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply('❌ Delete cancelled.');
        await showPurchaseMenu(ctx, telegramId);
        return;
    }

    if (response !== 'YES') {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    try {
        const deleted = await purchaseRepo.delete(session.data.purchaseId);
        if (deleted) {
            await ctx.reply(`✅ Purchase deleted successfully.`);
        } else {
            await ctx.reply(`❌ Failed to delete purchase.`);
        }
    } catch (error) {
        logger.error('Delete purchase error:', error);
        await ctx.reply(`❌ Failed to delete purchase: ${error.message}`);
    }

    sessionManager.clearSession(telegramId);
    await showPurchaseMenu(ctx, telegramId);
}

async function listPurchases(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    try {
        const purchases = await purchaseRepo.findByUserId(user.id);

        if (purchases.length === 0) {
            await ctx.reply('📋 **No purchases found.**\n\nRecord your first purchase using the Record Purchase button.');
            await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
            return;
        }

        let message = `🛒 **Purchase List (${purchases.length})**\n\n`;
        for (const purchase of purchases.slice(0, 20)) {
            const status = purchase.payment_status === 'PAID' ? '✅' : 
                          purchase.payment_status === 'PARTIAL' ? '🟡' : '🔴';
            message += `${status} **${purchase.item_name}**\n`;
            message += `   🔢 ${purchase.quantity} × ₦${purchase.unit_cost.toLocaleString()}\n`;
            message += `   💵 ₦${purchase.total_cost.toLocaleString()}\n`;
            message += `   🏢 ${purchase.supplier_name || 'N/A'}\n`;
            message += `   📅 ${new Date(purchase.purchase_date).toLocaleDateString()}\n\n`;
        }

        if (purchases.length > 20) {
            message += `... and ${purchases.length - 20} more.\n`;
        }

        await ctx.reply(message);
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });

    } catch (error) {
        logger.error('List purchases error:', error);
        sessionManager.clearSession(telegramId);
        await ctx.reply('❌ Failed to load purchases.');
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
    }
}

async function purchaseSummary(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    try {
        const summary = await purchaseRepo.getPurchaseSummary(user.id);
        if (!summary || summary.total_purchases === 0) {
            await ctx.reply('📊 **No purchase data available.**');
            await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
            return;
        }

        let message =
            `📊 **Purchase Summary**\n\n` +
            `📋 Total Purchases: ${summary.total_purchases}\n` +
            `📦 Total Items: ${summary.total_items || 0}\n` +
            `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
            `📈 Average Purchase: ₦${(summary.average_purchase || 0).toLocaleString()}\n` +
            `🏢 Suppliers Used: ${summary.suppliers_used || 0}\n`;

        if (summary.total_paid !== undefined) {
            message += `✅ Total Paid: ₦${(summary.total_paid || 0).toLocaleString()}\n`;
        }
        if (summary.total_outstanding !== undefined) {
            message += `🔴 Total Outstanding: ₦${(summary.total_outstanding || 0).toLocaleString()}\n`;
        }

        await ctx.reply(message);
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });

    } catch (error) {
        logger.error('Purchase summary error:', error);
        sessionManager.clearSession(telegramId);
        await ctx.reply('❌ Failed to load purchase summary.');
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
    }
}

async function purchaseToday(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    try {
        const purchases = await purchaseRepo.getTodayPurchases(user.id);

        if (purchases.length === 0) {
            await ctx.reply('📈 **No purchases recorded today.**');
            await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
            return;
        }

        const total = purchases.reduce((sum, p) => sum + p.total_cost, 0);
        let message = `📈 **Today's Purchases**\n\n`;
        message += `📋 ${purchases.length} purchases totaling ₦${total.toLocaleString()}\n\n`;

        for (const purchase of purchases.slice(0, 10)) {
            message += `• ${purchase.item_name} (${purchase.quantity}) — ₦${purchase.total_cost.toLocaleString()}\n`;
        }

        if (purchases.length > 10) {
            message += `... and ${purchases.length - 10} more.\n`;
        }

        await ctx.reply(message);
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });

    } catch (error) {
        logger.error('Purchase today error:', error);
        sessionManager.clearSession(telegramId);
        await ctx.reply('❌ Failed to load today\'s purchases.');
        await ctx.reply(`Select an option below:`, { ...getPurchaseKeyboard() });
    }
}

async function handleButtonClick(ctx, businessId, telegramId, userId) {
    const data = ctx.callbackQuery?.data;
    console.log('🔍 [handleButtonClick] Data:', data);

    if (data === 'purchase_add') {
        sessionManager.clearSession(telegramId);
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_ITEM');
        await ctx.editMessageText(
            `🛒 **Record Purchase**

Enter the **item name**:`
        );
        return;
    }

    if (data === 'purchase_list') {
        await listPurchases(ctx);
        return;
    }

    if (data === 'purchase_summary') {
        await purchaseSummary(ctx);
        return;
    }

    if (data === 'purchase_today') {
        await purchaseToday(ctx);
        return;
    }

    if (data === 'purchase_delete') {
        sessionManager.clearSession(telegramId);
        sessionManager.setState(telegramId, 'PURCHASE_WAITING_DELETE_ID');
        await ctx.editMessageText(
            `🗑️ **Delete Purchase**

Enter the purchase ID to delete:`
        );
        return;
    }

    if (data === 'menu_back') {
        const user = await userRepo.findByTelegramId(telegramId);
        const businesses = await businessRepo.findByUserId(user.id);
        const business = businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';
        await ctx.editMessageText(
            `📊 **Main Menu**\n\nSelect an option below:`,
            { parse_mode: 'Markdown', ...getMainMenuKeyboard(industry) }
        );
        return;
    }

    await showPurchaseMenu(ctx, telegramId);
}

module.exports = {
    purchaseHandler,
    startPurchaseFlow: purchaseHandler,
    listPurchases,
    purchaseSummary,
    purchaseToday,
};