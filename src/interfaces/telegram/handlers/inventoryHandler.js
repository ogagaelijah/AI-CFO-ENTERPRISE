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

async function inventoryHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        if (!state || !state.startsWith('INVENTORY_')) {
            await showInventoryMenu(ctx, telegramId, user);
            return;
        }

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
            default:
                await showInventoryMenu(ctx, telegramId, user);
                break;
        }

    } catch (error) {
        logger.error('Inventory handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

// =============================================
// SHOW INVENTORY MENU
// =============================================
async function showInventoryMenu(ctx, telegramId, user) {
    const inventoryItems = await inventoryRepo.findByUserId(user.id);
    const summary = await inventoryRepo.getSummary(user.id);

    let message =
        `📦 **Inventory Management**\n\n` +
        `📊 **Summary**\n` +
        `• Total Items: ${summary.total_items || 0}\n` +
        `• Total Stock: ${summary.total_quantity || 0} units\n` +
        `• Total Cost Value: ₦${(summary.total_cost_value || 0).toLocaleString()}\n` +
        `• Total Selling Value: ₦${(summary.total_selling_value || 0).toLocaleString()}\n` +
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
}

// =============================================
// ADD ITEM FLOW
// =============================================
async function handleAddItem(ctx, telegramId, user) {
    const text = ctx.message.text.trim();

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
    const text = ctx.message.text.trim();
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
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const costPrice = parseFloat(text);

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
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const sellingPrice = parseFloat(text);

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
    const text = ctx.message.text.trim();

    if (!text) {
        await ctx.reply('Please enter the item name or ID to edit.');
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
    const text = ctx.message.text.trim();
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
    const text = ctx.message.text.trim().replace(/,/g, '');
    const session = sessionManager.getSession(telegramId);
    const value = parseFloat(text);

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
    const text = ctx.message.text.trim();

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
    const text = ctx.message.text.trim();
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
    const text = ctx.message.text.trim();
    const session = sessionManager.getSession(telegramId);
    const quantity = parseInt(text);

    if (isNaN(quantity) || quantity < 0) {
        await ctx.reply('⚠️ Please enter a valid positive number.');
        return;
    }

    let newQuantity = session.data.currentQuantity;
    const adjustType = session.data.adjustType;

    if (adjustType === '1') {
        // Add Stock
        newQuantity = session.data.currentQuantity + quantity;
    } else if (adjustType === '2') {
        // Remove Stock
        if (quantity > session.data.currentQuantity) {
            await ctx.reply(`⚠️ Cannot remove ${quantity} units. Only ${session.data.currentQuantity} units available.`);
            return;
        }
        newQuantity = session.data.currentQuantity - quantity;
    } else if (adjustType === '3') {
        // Set Exact Quantity
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
// CONFIRMATION HANDLER (Handles ALL confirmations)
// =============================================
async function handleConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        const pendingAction = session.data.pendingAction;

        try {
            if (pendingAction === 'add_stock') {
                // Add new stock
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
                // Adjust existing stock
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
                // Unknown action
                sessionManager.clearSession(telegramId);
                await ctx.reply('❌ Unknown action. Please try again.');
                await showInventoryMenu(ctx, telegramId, user);
            }

        } catch (error) {
            logger.error('Confirmation error:', error);
            await ctx.reply(`❌ Failed to complete action: ${error.message}`);
        }

    } else if (text === 'NO') {
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
// LIST INVENTORY
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

    for (const item of items) {
        const status = item.quantity <= 0 ? '🚫' : item.quantity <= LOW_STOCK_THRESHOLD ? '⚠️' : '✅';
        const profit = (item.selling_price || 0) - (item.cost_price || 0);
        totalCostValue += (item.quantity || 0) * (item.cost_price || 0);
        totalSellingValue += (item.quantity || 0) * (item.selling_price || 0);

        message += `${status} **${item.item_name}**\n`;
        message += `   📦 ${item.quantity || 0} units\n`;
        message += `   💰 Cost: ₦${(item.cost_price || 0).toLocaleString()}\n`;
        message += `   💲 Sell: ₦${(item.selling_price || 0).toLocaleString()}\n`;
        if (profit > 0) {
            message += `   📈 Profit: ₦${profit.toLocaleString()} (${item.cost_price > 0 ? ((profit / item.cost_price) * 100).toFixed(1) : 0}% margin)\n`;
        }
        message += `   🆔 ID: ${item.id}\n\n`;
    }

    message += `📊 **Total Value**\n`;
    message += `   💰 Cost: ₦${totalCostValue.toLocaleString()}\n`;
    message += `   💲 Sell: ₦${totalSellingValue.toLocaleString()}\n`;
    message += `   📈 Potential Profit: ₦${(totalSellingValue - totalCostValue).toLocaleString()}`;

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