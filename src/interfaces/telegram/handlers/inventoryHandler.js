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

// ✅ Low stock threshold
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
            case 'INVENTORY_WAITING_CONFIRMATION':
                await handleInventoryConfirmation(ctx, telegramId, user);
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
            message += `\n`;
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
            `To add more stock, use the "Add Stock" button again.`
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

    // ✅ Calculate totals for this batch
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

async function handleInventoryConfirmation(ctx, telegramId, user) {
    const text = ctx.message.text.trim().toUpperCase();
    const session = sessionManager.getSession(telegramId);

    if (text === 'YES') {
        try {
            const result = await addStockUseCase.execute({
                userId: user.id,
                itemName: session.data.itemName,
                quantity: session.data.quantity,
                costPrice: session.data.costPrice,
                sellingPrice: session.data.sellingPrice,
            });

            // ✅ Clear session after successful addition
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

        } catch (error) {
            logger.error('Add stock error:', error);
            await ctx.reply(`❌ Failed to add stock: ${error.message}`);
        }
    } else if (text === 'NO') {
        sessionManager.clearSession(telegramId);
        await ctx.reply(
            `❌ **Stock Addition Cancelled.**\n\nSelect an option below:`,
            { ...getInventoryKeyboard() }
        );
    } else {
        await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
    }
}

// =============================================
// LIST INVENTORY - Returns to submenu
// =============================================
async function listInventory(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    // ✅ Clear any existing session
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
            message += `   📈 Profit: ₦${profit.toLocaleString()}\n`;
        }
        message += `\n`;
    }

    message += `📊 **Total Value**\n`;
    message += `   💰 Cost: ₦${totalCostValue.toLocaleString()}\n`;
    message += `   💲 Sell: ₦${totalSellingValue.toLocaleString()}\n`;
    message += `   📈 Potential Profit: ₦${(totalSellingValue - totalCostValue).toLocaleString()}`;

    await ctx.reply(message);
    await ctx.reply(`Select an option below:`, { ...getInventoryKeyboard() });
}

// =============================================
// LOW STOCK ALERT - Returns to submenu
// =============================================
async function lowStockAlert(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    // ✅ Clear any existing session
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
// TOTAL INVENTORY VALUE - Returns to submenu
// =============================================
async function inventoryValue(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    // ✅ Clear any existing session
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