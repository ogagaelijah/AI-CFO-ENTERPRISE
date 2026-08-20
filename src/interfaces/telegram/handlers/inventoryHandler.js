// src/interfaces/telegram/handlers/inventoryHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const AddStockUseCase = require('../../../application/useCases/inventory/AddStockUseCase');
const { getInventoryKeyboard, getBackKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const inventoryRepo = new InventoryRepository();
const addStockUseCase = new AddStockUseCase(inventoryRepo);

const LOW_STOCK_THRESHOLD = 5;

// Helper function to get text from either message or callback query
function getTextFromContext(ctx) {
    // Check for text message
    if (ctx.message && ctx.message.text) {
        return ctx.message.text.trim();
    }
    // Check for callback query
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
        return ctx.callbackQuery.data.trim();
    }
    // Check for update callback query
    if (ctx.update && ctx.update.callback_query && ctx.update.callback_query.data) {
        return ctx.update.callback_query.data.trim();
    }
    return null;
}

async function inventoryHandler(ctx) {
    try {
        console.log('🔍 [1] Inventory handler called');
        const telegramId = ctx.from.id;
        console.log('🔍 [2] Telegram ID:', telegramId);

        let session = sessionManager.getSession(telegramId);
        console.log('🔍 [3] Session:', session ? 'exists' : 'null');

        const user = await userRepo.findByTelegramId(telegramId);
        console.log('🔍 [4] User:', user ? `found (id: ${user.id})` : 'not found');

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        // Check if this is a button click (callback query)
        const isButtonClick = ctx.callbackQuery || (ctx.update && ctx.update.callback_query);
        if (isButtonClick) {
            console.log('🔍 [5] Button click detected — clearing session');
            sessionManager.clearSession(telegramId);
            session = sessionManager.getSession(telegramId);
        }

        const state = session ? session.state : null;
        console.log('🔍 [6] State:', state);

        if (!state || !state.startsWith('INVENTORY_')) {
            console.log('🔍 [7] Showing inventory menu');
            await showInventoryMenu(ctx, telegramId, user);
            return;
        }

        console.log('🔍 [8] Handling state:', state);
        switch (state) {
            case 'INVENTORY_WAITING_ITEM':
                await handleAddItem(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_QUANTITY':
                await handleAddQuantity(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_COST_PRICE':
                await handleCostPrice(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_SELLING_PRICE':
                await handleSellingPrice(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_EDIT_ITEM':
                await handleEditItem(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_EDIT_FIELD':
                await handleEditField(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_EDIT_VALUE':
                await handleEditValue(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_ADJUST_QUANTITY':
                await handleAdjustItem(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_ADJUST_TYPE':
                await handleAdjustType(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_ADJUST_VALUE':
                await handleAdjustValue(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_CONFIRMATION':
                await handleConfirmation(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_DELETE_ID':
                await handleInventoryDeleteId(ctx, telegramId, user);
                break;
            case 'INVENTORY_WAITING_DELETE_CONFIRM':
                await handleInventoryDeleteConfirm(ctx, telegramId, user);
                break;
            default:
                await showInventoryMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        console.error('❌ INVENTORY HANDLER CRASH:', error.message);
        console.error('❌ Stack:', error.stack);
        logger.error('Inventory handler error:', {
            message: error.message,
            stack: error.stack
        });
        await ctx.reply(`❌ Error: ${error.message}`);
    }
}

// =============================================
// SHOW INVENTORY MENU (UPDATED with profit & margin)
// =============================================
async function showInventoryMenu(ctx, telegramId, user) {
    try {
        console.log('🔍 [menu] Starting showInventoryMenu');
        console.log('🔍 [menu] User ID:', user.id);

        console.log('🔍 [menu] Calling findByUserId...');
        const inventoryItems = await inventoryRepo.findByUserId(user.id);
        console.log('🔍 [menu] Found items:', inventoryItems.length);

        console.log('🔍 [menu] Calling getSummary...');
        const summary = await inventoryRepo.getSummary(user.id);
        console.log('🔍 [menu] Summary:', summary);

        // Calculate margin
        const margin = summary.total_cost_value > 0 
            ? ((summary.total_profit / summary.total_cost_value) * 100).toFixed(1) 
            : 0;

        let message =
            `📦 **Inventory Management**\n\n` +
            `📊 **Summary**\n` +
            `• Total Items: ${summary.total_items || 0}\n` +
            `• Total Stock: ${summary.total_quantity || 0} units\n` +
            `• Total Cost Value: ₦${(summary.total_cost_value || 0).toLocaleString()}\n` +
            `• Total Selling Value: ₦${(summary.total_selling_value || 0).toLocaleString()}\n` +
            `• Potential Profit: ₦${(summary.total_profit || 0).toLocaleString()}\n` +
            `• Margin: ${margin}%\n` +
            `• Low Stock: ${summary.low_stock_count || 0} items\n\n`;

        if (inventoryItems.length > 0) {
            message += `**Your Items:**\n`;
            for (const item of inventoryItems.slice(0, 10)) {
                const status = item.quantity <= 0 ? '🚫' : item.quantity <= LOW_STOCK_THRESHOLD ? '⚠️' : '✅';
                const profit = (item.selling_price || 0) - (item.cost_price || 0);
                const profitMargin = item.cost_price > 0 ? ((profit / item.cost_price) * 100).toFixed(1) : 0;
                message += `${status} **${item.item_name}**\n`;
                message += `   📦 ${item.quantity} units\n`;
                message += `   💰 Cost: ₦${(item.cost_price || 0).toLocaleString()}\n`;
                message += `   💲 Sell: ₦${(item.selling_price || 0).toLocaleString()}\n`;
                if (profit > 0) {
                    message += `   📈 Profit: ₦${profit.toLocaleString()} (${profitMargin}% margin)\n`;
                }
                message += `   🆔 ID: ${item.id}\n\n`;
            }
            if (inventoryItems.length > 10) {
                message += `... and ${inventoryItems.length - 10} more.\n\n`;
            }
        } else {
            message += `✅ No items in inventory.\n\n`;
        }

        message += `Select an option below:`;

        const keyboard = getInventoryKeyboard();

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

    } catch (error) {
        console.error('❌ [menu] showInventoryMenu crashed:', error.message);
        console.error('❌ [menu] Stack:', error.stack);
        throw error;
    }
}

// =============================================
// ADD ITEM FLOW
// =============================================
async function handleAddItem(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [addItem] Text received:', text);

    if (!text || text.length < 2) {
        await ctx.reply('Please enter a valid item name (at least 2 characters).');
        return;
    }

    const existing = await inventoryRepo.findByName(user.id, text);

    if (existing) {
        await ctx.reply(
            `⚠️ "${text}" already exists in inventory.\n` +
            `Current stock: ${existing.quantity}\n` +
            `Cost Price: ₦${(existing.cost_price || 0).toLocaleString()}\n` +
            `Selling Price: ₦${(existing.selling_price || 0).toLocaleString()}\n\n` +
            `To add more stock, use the "Adjust Stock" button.`
        );
        return;
    }

    sessionManager.setData(telegramId, { itemName: text });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_QUANTITY');

    await ctx.reply(
        `📦 **${text}**\n\n` +
        `Enter the **quantity** to add:`
    );
}

async function handleAddQuantity(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [addQuantity] Text received:', text);
    const quantity = parseInt(text);

    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { ...session.data, quantity });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_COST_PRICE');

    await ctx.reply(
        `📦 ${session.data.itemName}\n` +
        `Quantity: **${quantity}**\n\n` +
        `Enter the **cost price** per unit (what you paid):`
    );
}

async function handleCostPrice(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [costPrice] Text received:', text);
    const cleanText = text ? text.replace(/,/g, '') : '';
    const session = sessionManager.getSession(telegramId);
    const costPrice = parseFloat(cleanText);

    if (isNaN(costPrice) || costPrice < 0) {
        await ctx.reply('⚠️ Please enter a valid cost price (e.g., 5000).');
        return;
    }

    sessionManager.setData(telegramId, { ...session.data, costPrice });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_SELLING_PRICE');

    await ctx.reply(
        `📦 ${session.data.itemName}\n` +
        `Quantity: **${session.data.quantity}**\n` +
        `Cost Price: ₦${costPrice.toLocaleString()}\n\n` +
        `Enter the **selling price** per unit (what you sell for):`
    );
}

async function handleSellingPrice(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [sellingPrice] Text received:', text);
    const cleanText = text ? text.replace(/,/g, '') : '';
    const session = sessionManager.getSession(telegramId);
    const sellingPrice = parseFloat(cleanText);

    if (isNaN(sellingPrice) || sellingPrice < 0) {
        await ctx.reply('⚠️ Please enter a valid selling price (e.g., 7000).');
        return;
    }

    const totalCost = session.data.quantity * session.data.costPrice;
    const totalSell = session.data.quantity * sellingPrice;
    const totalProfit = totalSell - totalCost;
    const profitMargin = session.data.costPrice > 0 ? ((sellingPrice - session.data.costPrice) / session.data.costPrice * 100).toFixed(1) : 0;

    sessionManager.setData(telegramId, {
        ...session.data,
        sellingPrice,
        totalCost,
        totalSell,
        totalProfit,
        profitMargin,
        pendingAction: 'add_stock'
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_CONFIRMATION');

    await ctx.reply(
        `📋 **Confirm Stock Addition**\n\n` +
        `📦 Item: ${session.data.itemName}\n` +
        `🔢 Quantity: ${session.data.quantity} units\n` +
        `💰 Cost Price: ₦${session.data.costPrice.toLocaleString()} / unit\n` +
        `💲 Selling Price: ₦${sellingPrice.toLocaleString()} / unit\n\n` +
        `📊 **Batch Summary**\n` +
        `   💰 Total Cost: ₦${totalCost.toLocaleString()}\n` +
        `   💲 Total Value: ₦${totalSell.toLocaleString()}\n` +
        `   📈 Potential Profit: ₦${totalProfit.toLocaleString()} (${profitMargin}% margin)\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// EDIT ITEM FLOW
// =============================================
async function handleEditItem(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [editItem] Text received:', text);

    // If it's a menu button (starts with "menu_"), show the menu instead
    if (!text || text.startsWith('menu_')) {
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    let item = null;
    const id = parseInt(text);
    if (!isNaN(id) && id > 0) {
        item = await inventoryRepo.findById(id);
    }
    
    if (!item) {
        item = await inventoryRepo.findByName(user.id, text);
    }

    if (!item) {
        await ctx.reply(`❌ Item "${text}" not found in inventory.`);
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { 
        ...session.data, 
        itemId: item.id,
        itemName: item.item_name,
        currentCost: item.cost_price,
        currentSell: item.selling_price,
        currentQuantity: item.quantity,
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_EDIT_FIELD');

    await ctx.reply(
        `✏️ **Edit Item: ${item.item_name}**\n\n` +
        `📦 ID: ${item.id}\n` +
        `📦 Quantity: ${item.quantity} units\n` +
        `💰 Cost Price: ₦${(item.cost_price || 0).toLocaleString()}\n` +
        `💲 Selling Price: ₦${(item.selling_price || 0).toLocaleString()}\n\n` +
        `**What do you want to update?**\n` +
        `1️⃣ Cost Price\n` +
        `2️⃣ Selling Price\n` +
        `3️⃣ Reorder Level\n\n` +
        `Reply with **1**, **2**, or **3**:`
    );
}

async function handleEditField(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [editField] Text received:', text);
    const session = sessionManager.getSession(telegramId);

    if (!['1', '2', '3'].includes(text)) {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
        return;
    }

    const fieldMap = {
        '1': { field: 'cost_price', label: 'Cost Price', current: session.data.currentCost },
        '2': { field: 'selling_price', label: 'Selling Price', current: session.data.currentSell },
        '3': { field: 'reorder_level', label: 'Reorder Level', current: 5 },
    };

    const selected = fieldMap[text];
    sessionManager.setData(telegramId, { 
        ...session.data, 
        editField: selected.field,
        editLabel: selected.label,
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_EDIT_VALUE');

    await ctx.reply(
        `✏️ **Edit ${selected.label}**\n\n` +
        `Current ${selected.label.toLowerCase()}: ${selected.current}\n` +
        `Enter the new value:`
    );
}

async function handleEditValue(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [editValue] Text received:', text);
    const cleanText = text ? text.replace(/,/g, '') : '';
    const session = sessionManager.getSession(telegramId);
    const value = parseFloat(cleanText);

    if (isNaN(value) || value < 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    try {
        const updateData = {};
        updateData[session.data.editField] = value;

        await inventoryRepo.update(session.data.itemId, updateData);
        const updated = await inventoryRepo.findById(session.data.itemId);

        sessionManager.clearSession(telegramId);

        await ctx.reply(
            `✅ **Item Updated Successfully!**\n\n` +
            `📦 Item: ${updated.item_name}\n` +
            `💰 Cost Price: ₦${(updated.cost_price || 0).toLocaleString()}\n` +
            `💲 Selling Price: ₦${(updated.selling_price || 0).toLocaleString()}\n` +
            `📦 Quantity: ${updated.quantity} units\n\n` +
            `Select an option below:`,
            { ...getInventoryKeyboard() }
        );

    } catch (error) {
        logger.error('Edit item error:', error);
        await ctx.reply(`❌ Failed to update item: ${error.message}`);
    }
}

// =============================================
// ADJUST STOCK FLOW
// =============================================
async function handleAdjustItem(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [adjustItem] Text received:', text);

    if (!text) {
        await ctx.reply('Please enter the item name or ID to adjust.');
        return;
    }

    let item = null;
    const id = parseInt(text);
    if (!isNaN(id) && id > 0) {
        item = await inventoryRepo.findById(id);
    }
    
    if (!item) {
        item = await inventoryRepo.findByName(user.id, text);
    }

    if (!item) {
        await ctx.reply(`❌ Item "${text}" not found in inventory.`);
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    const session = sessionManager.getSession(telegramId);
    sessionManager.setData(telegramId, { 
        ...session.data, 
        itemId: item.id,
        itemName: item.item_name,
        currentQuantity: item.quantity,
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_ADJUST_TYPE');

    await ctx.reply(
        `📦 **Adjust Stock: ${item.item_name}**\n\n` +
        `📦 Current Quantity: ${item.quantity} units\n\n` +
        `**Adjustment Type:**\n` +
        `1️⃣ Add Stock (increase)\n` +
        `2️⃣ Remove Stock (decrease)\n` +
        `3️⃣ Set Exact Quantity\n\n` +
        `Reply with **1**, **2**, or **3**:`
    );
}

async function handleAdjustType(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [adjustType] Text received:', text);
    const session = sessionManager.getSession(telegramId);

    if (!['1', '2', '3'].includes(text)) {
        await ctx.reply('⚠️ Please reply with **1**, **2**, or **3**.');
        return;
    }

    const typeMap = {
        '1': 'Add Stock',
        '2': 'Remove Stock', 
        '3': 'Set Exact Quantity'
    };

    sessionManager.setData(telegramId, { 
        ...session.data, 
        adjustType: text,
        adjustLabel: typeMap[text],
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_ADJUST_VALUE');

    await ctx.reply(
        `📦 **Adjust Stock: ${session.data.itemName}**\n\n` +
        `Current Quantity: ${session.data.currentQuantity} units\n` +
        `Action: ${typeMap[text]}\n\n` +
        `Enter the **quantity**:`
    );
}

async function handleAdjustValue(ctx, telegramId, user) {
    const text = getTextFromContext(ctx);
    console.log('🔍 [adjustValue] Text received:', text);
    const session = sessionManager.getSession(telegramId);
    const quantity = parseInt(text);

    if (isNaN(quantity) || quantity < 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    let newQuantity = session.data.currentQuantity;
    const adjustType = session.data.adjustType;

    if (adjustType === '1') {
        newQuantity = session.data.currentQuantity + quantity;
    } else if (adjustType === '2') {
        if (quantity > session.data.currentQuantity) {
            await ctx.reply(`⚠️ Cannot remove ${quantity} units. Only ${session.data.currentQuantity} units available.`);
            return;
        }
        newQuantity = session.data.currentQuantity - quantity;
    } else if (adjustType === '3') {
        newQuantity = quantity;
    }

    sessionManager.setData(telegramId, { 
        ...session.data, 
        adjustQuantity: quantity,
        newQuantity: newQuantity,
        pendingAction: 'adjust_stock'
    });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_CONFIRMATION');

    const actionLabel = adjustType === '1' ? 'Add' : adjustType === '2' ? 'Remove' : 'Set to';
    
    await ctx.reply(
        `📋 **Confirm Stock Adjustment**\n\n` +
        `📦 Item: ${session.data.itemName}\n` +
        `📦 Current Quantity: ${session.data.currentQuantity} units\n` +
        `📦 Action: ${actionLabel} ${quantity} units\n` +
        `📦 New Quantity: ${newQuantity} units\n\n` +
        `Reply with **YES** to confirm or **NO** to cancel.`
    );
}

// =============================================
// CONFIRMATION HANDLER (FIXED)
// =============================================
async function handleConfirmation(ctx, telegramId, user) {
    const session = sessionManager.getSession(telegramId);
    
    // Get text from context - handle both message and callback query
    let text = null;
    if (ctx.message && ctx.message.text) {
        text = ctx.message.text.trim();
    } else if (ctx.callbackQuery && ctx.callbackQuery.data) {
        text = ctx.callbackQuery.data.trim();
    } else if (ctx.update && ctx.update.callback_query && ctx.update.callback_query.data) {
        text = ctx.update.callback_query.data.trim();
    }

    console.log('🔍 [confirmation] Raw text received:', text);
    console.log('🔍 [confirmation] Session state:', session ? session.state : 'null');
    console.log('🔍 [confirmation] Pending action:', session?.data?.pendingAction);

    if (!session || !session.data || !session.data.pendingAction) {
        console.log('🔍 [confirmation] No session or pending action, showing menu');
        await ctx.reply('⚠️ Session expired. Please start over.');
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    // Normalize text for comparison
    const normalizedText = text ? text.toUpperCase() : '';
    console.log('🔍 [confirmation] Normalized text:', normalizedText);

    if (normalizedText === 'YES') {
        const pendingAction = session.data.pendingAction;
        console.log('🔍 [confirmation] Processing YES for action:', pendingAction);

        try {
            if (pendingAction === 'add_stock') {
                await addStockUseCase.execute({
                    userId: user.id,
                    itemName: session.data.itemName,
                    quantity: session.data.quantity,
                    costPrice: session.data.costPrice,
                    sellingPrice: session.data.sellingPrice,
                });

                sessionManager.clearSession(telegramId);

                await ctx.reply(
                    `✅ **Stock Added Successfully!**\n\n` +
                    `📦 Item: ${session.data.itemName}\n` +
                    `🔢 Quantity: ${session.data.quantity} units\n\n` +
                    `💰 Cost Price: ₦${session.data.costPrice.toLocaleString()} / unit\n` +
                    `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()} / unit\n\n` +
                    `📊 **Batch Summary**\n` +
                    `   💰 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
                    `   💲 Total Value: ₦${session.data.totalSell.toLocaleString()}\n` +
                    `   📈 Potential Profit: ₦${session.data.totalProfit.toLocaleString()} (${session.data.profitMargin}% margin)\n\n` +
                    `Select an option below:`,
                    { ...getInventoryKeyboard() }
                );

            } else if (pendingAction === 'adjust_stock') {
                await inventoryRepo.update(session.data.itemId, {
                    quantity: session.data.newQuantity,
                });

                const updated = await inventoryRepo.findById(session.data.itemId);
                sessionManager.clearSession(telegramId);

                await ctx.reply(
                    `✅ **Stock Adjusted Successfully!**\n\n` +
                    `📦 Item: ${updated.item_name}\n` +
                    `📦 Old Quantity: ${session.data.currentQuantity} units\n` +
                    `📦 New Quantity: ${updated.quantity} units\n` +
                    `📦 Change: ${updated.quantity - session.data.currentQuantity > 0 ? '+' : ''}${updated.quantity - session.data.currentQuantity} units\n\n` +
                    `Select an option below:`,
                    { ...getInventoryKeyboard() }
                );

            } else {
                sessionManager.clearSession(telegramId);
                await ctx.reply('❌ Unknown action. Please try again.');
                await showInventoryMenu(ctx, telegramId, user);
            }

        } catch (error) {
            console.error('❌ [confirmation] Error:', error.message);
            logger.error('Confirmation error:', error);
            await ctx.reply(`❌ Failed to complete action: ${error.message}`);
        }

    } else if (normalizedText === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Operation Cancelled.**\n\nSelect an option below:`,
            { ...getInventoryKeyboard() }
        );
    } else {
        // Re-display confirmation
        const pendingAction = session.data.pendingAction;
        let message = `⚠️ Please reply with **YES** or **NO**.\n\n`;

        if (pendingAction === 'add_stock') {
            message +=
                `📋 **Confirm Stock Addition**\n\n` +
                `📦 Item: ${session.data.itemName}\n` +
                `🔢 Quantity: ${session.data.quantity} units\n` +
                `💰 Cost Price: ₦${session.data.costPrice.toLocaleString()} / unit\n` +
                `💲 Selling Price: ₦${session.data.sellingPrice.toLocaleString()} / unit\n\n` +
                `📊 **Batch Summary**\n` +
                `   💰 Total Cost: ₦${session.data.totalCost.toLocaleString()}\n` +
                `   💲 Total Value: ₦${session.data.totalSell.toLocaleString()}\n` +
                `   📈 Potential Profit: ₦${session.data.totalProfit.toLocaleString()} (${session.data.profitMargin}% margin)`;
        } else if (pendingAction === 'adjust_stock') {
            const actionLabel = session.data.adjustType === '1' ? 'Add' : session.data.adjustType === '2' ? 'Remove' : 'Set to';
            message +=
                `📋 **Confirm Stock Adjustment**\n\n` +
                `📦 Item: ${session.data.itemName}\n` +
                `📦 Current Quantity: ${session.data.currentQuantity} units\n` +
                `📦 Action: ${actionLabel} ${session.data.adjustQuantity} units\n` +
                `📦 New Quantity: ${session.data.newQuantity} units`;
        }

        message += `\n\nReply with **YES** to confirm or **NO** to cancel.`;
        await ctx.reply(message);
    }
}

// =============================================
// DELETE INVENTORY ITEM FLOW
// =============================================
async function handleInventoryDeleteId(ctx, telegramId, user) {
    const text = ctx.message?.text;

    if (!text) {
        sessionManager.setState(telegramId, 'INVENTORY_WAITING_DELETE_ID');
        await ctx.reply(
            `🗑️ **Delete Inventory Item**

Enter the item ID to delete:`
        );
        return;
    }

    const itemId = parseInt(text.trim());
    if (isNaN(itemId) || itemId <= 0) {
        await ctx.reply('⚠️ Please enter a valid item ID.');
        return;
    }

    const item = await inventoryRepo.findById(itemId);
    if (!item || item.user_id !== user.id) {
        await ctx.reply('❌ Item not found.');
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    sessionManager.setData(telegramId, { itemId, item });
    sessionManager.setState(telegramId, 'INVENTORY_WAITING_DELETE_CONFIRM');

    await ctx.reply(
        `⚠️ **Confirm Delete**

Are you sure you want to delete this inventory item?

📦 Item: ${item.item_name}
📦 Quantity: ${item.quantity}
💰 Cost Price: ₦${(item.cost_price || 0).toLocaleString()}
💲 Selling Price: ₦${(item.selling_price || 0).toLocaleString()}

Reply with **YES** to confirm or **NO** to cancel.`
    );
}

async function handleInventoryDeleteConfirm(ctx, telegramId, user) {
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
        await showInventoryMenu(ctx, telegramId, user);
        return;
    }

    if (response !== 'YES') {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
        return;
    }

    try {
        const deleted = await inventoryRepo.delete(session.data.itemId);
        if (deleted) {
            await ctx.reply(`✅ Inventory item deleted successfully.`);
        } else {
            await ctx.reply(`❌ Failed to delete item.`);
        }
    } catch (error) {
        logger.error('Delete inventory error:', error);
        await ctx.reply(`❌ Failed to delete item: ${error.message}`);
    }

    sessionManager.clearSession(telegramId);
    await showInventoryMenu(ctx, telegramId, user);
}

// =============================================
// LIST INVENTORY (UPDATED with correct profit)
// =============================================
async function listInventory(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    sessionManager.clearSession(telegramId);

    const items = await inventoryRepo.findByUserId(user.id);

    if (items.length === 0) {
        await ctx.reply('📦 **Inventory is empty.**\n\nAdd items using the Inventory menu.');
        await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
        return;
    }

    let message = `📦 **Inventory List**\n\n`;
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let totalProfitValue = 0;

    for (const item of items) {
        const quantity = item.quantity || 0;
        const costPrice = item.cost_price || 0;
        const sellingPrice = item.selling_price || 0;
        
        // Calculate per item totals
        const itemCost = quantity * costPrice;
        const itemSell = quantity * sellingPrice;
        const itemProfit = itemSell - itemCost;
        
        totalCostValue += itemCost;
        totalSellingValue += itemSell;
        totalProfitValue += itemProfit;

        // Status indicator
        const status = quantity <= 0 ? '🚫' : quantity <= LOW_STOCK_THRESHOLD ? '⚠️' : '✅';
        
        // Per-unit profit and margin
        const unitProfit = sellingPrice - costPrice;
        const profitMargin = costPrice > 0 ? ((unitProfit / costPrice) * 100).toFixed(1) : 0;

        message += `${status} **${item.item_name}**\n`;
        message += `   📦 ${quantity} units\n`;
        message += `   💰 Cost: ₦${costPrice.toLocaleString()}\n`;
        message += `   💲 Sell: ₦${sellingPrice.toLocaleString()}\n`;
        
        // Only show profit if selling price > 0
        if (sellingPrice > 0 && unitProfit > 0) {
            message += `   📈 Profit: ₦${unitProfit.toLocaleString()} (${profitMargin}% margin) per unit\n`;
        } else if (sellingPrice > 0 && unitProfit <= 0) {
            message += `   📉 Loss: ₦${Math.abs(unitProfit).toLocaleString()} (${profitMargin}% margin) per unit\n`;
        }
        message += `   🆔 ID: ${item.id}\n\n`;
    }

    // Calculate total margin
    const totalMargin = totalCostValue > 0 ? ((totalProfitValue / totalCostValue) * 100).toFixed(1) : 0;

    message += `📊 **Total Value**\n`;
    message += `   💰 Total Cost: ₦${totalCostValue.toLocaleString()}\n`;
    message += `   💲 Total Selling: ₦${totalSellingValue.toLocaleString()}\n`;
    message += `   📈 Potential Profit: ₦${totalProfitValue.toLocaleString()}\n`;
    message += `   📊 Margin: ${totalMargin}%\n`;

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
}

// =============================================
// LOW STOCK ALERT
// =============================================
async function lowStockAlert(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    sessionManager.clearSession(telegramId);

    const items = await inventoryRepo.findLowStock(user.id);

    if (items.length === 0) {
        await ctx.reply('✅ **All items are well stocked!**');
        await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
        return;
    }

    let message = `⚠️ **Low Stock Alerts**\n\n`;
    message += `📋 Items with ${LOW_STOCK_THRESHOLD} or fewer units remaining:\n\n`;
    
    for (const item of items) {
        const status = item.quantity <= 0 ? '🚫 OUT OF STOCK' : '⚠️ LOW STOCK';
        message += `${status}: **${item.item_name}**\n`;
        message += `   📦 ${item.quantity} remaining\n`;
        message += `   💰 Cost: ₦${(item.cost_price || 0).toLocaleString()}\n`;
        message += `   💲 Sell: ₦${(item.selling_price || 0).toLocaleString()}\n\n`;
    }

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
}

// =============================================
// TOTAL INVENTORY VALUE
// =============================================
async function inventoryValue(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    sessionManager.clearSession(telegramId);

    const items = await inventoryRepo.findByUserId(user.id);
    const totalCostValue = items.reduce((sum, item) => sum + (item.quantity * (item.cost_price || 0)), 0);
    const totalSellingValue = items.reduce((sum, item) => sum + (item.quantity * (item.selling_price || 0)), 0);

    let message = `💰 **Total Inventory Value**\n\n`;
    message += `📦 Total Items: ${items.length}\n`;
    message += `📦 Total Units: ${items.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;
    message += `💰 Total Cost Value: ₦${totalCostValue.toLocaleString()}\n`;
    message += `💲 Total Selling Value: ₦${totalSellingValue.toLocaleString()}\n`;
    message += `📈 Potential Profit: ₦${(totalSellingValue - totalCostValue).toLocaleString()}`;

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
}

module.exports = { 
    inventoryHandler, 
    listInventory, 
    lowStockAlert,
    inventoryValue,
};