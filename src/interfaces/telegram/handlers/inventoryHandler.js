// src/interfaces/telegram/handlers/inventoryHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const AddStockUseCase = require('../../../application/useCases/inventory/AddStockUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const inventoryRepo = new InventoryRepository();
const addStockUseCase = new AddStockUseCase(inventoryRepo);

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
            const status = item.quantity <= 0 ? '🚫' : item.quantity <= 5 ? '⚠️' : '✅';
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
        message += `✅ No items in inventory.\n`;
    }

    message += `**Commands:**\n` +
        `/inventory add - Add new item\n` +
        `/inventory list - List all items\n` +
        `/inventory low - View low stock`;

    await ctx.reply(message);
}

async function handleAddItem(ctx, telegramId, user) {
    const text = ctx.message.text.trim();

    if (!text || text.length < 2) {
        await ctx.reply('Please enter a valid item name (at least 2 characters).');
        return;
    }

    // Check if item already exists
    const existing = await inventoryRepo.findByName(user.id, text);

    if (existing) {
        await ctx.reply(
            `⚠️ "${text}" already exists in inventory.\n` +
            `Current stock: ${existing.quantity}\n` +
            `Cost Price: ₦${(existing.cost_price || 0).toLocaleString()}\n` +
            `Selling Price: ₦${(existing.selling_price || 0).toLocaleString()}`
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

    try {
        const result = await addStockUseCase.execute({
            userId: user.id,
            itemName: session.data.itemName,
            quantity: session.data.quantity,
            costPrice: session.data.costPrice,
            sellingPrice: sellingPrice,
        });

        sessionManager.clearSession(telegramId);

        const profit = sellingPrice - session.data.costPrice;
        const profitMargin = session.data.costPrice > 0 ? ((profit / session.data.costPrice) * 100).toFixed(1) : 0;

        await ctx.reply(
            `✅ **Item Added to Inventory!**\n\n` +
            `📦 Item: ${session.data.itemName}\n` +
            `🔢 Quantity: ${session.data.quantity}\n` +
            `💰 Cost Price: ₦${session.data.costPrice.toLocaleString()}\n` +
            `💲 Selling Price: ₦${sellingPrice.toLocaleString()}\n` +
            `📈 Profit per unit: ₦${profit.toLocaleString()} (${profitMargin}% margin)\n\n` +
            `📦 Use /inventory to view your inventory.`
        );

    } catch (error) {
        logger.error('Add stock error:', error);
        await ctx.reply(`❌ Failed to add stock: ${error.message}`);
    }
}

async function listInventory(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const items = await inventoryRepo.findByUserId(user.id);

    if (items.length === 0) {
        await ctx.reply('📦 **Inventory is empty.**\n\nAdd items using /inventory add');
        return;
    }

    let message = `📦 **Inventory List**\n\n`;
    let totalCostValue = 0;
    let totalSellingValue = 0;

    for (const item of items) {
        const status = item.quantity <= 0 ? '🚫' : item.quantity <= 5 ? '⚠️' : '✅';
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
}

async function lowStockAlert(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
        await ctx.reply('⚠️ Please register first. Type /start');
        return;
    }

    const items = await inventoryRepo.findLowStock(user.id);

    if (items.length === 0) {
        await ctx.reply('✅ **All items are well stocked!**');
        return;
    }

    let message = `⚠️ **Low Stock Alerts**\n\n`;
    for (const item of items) {
        const status = item.quantity <= 0 ? '🚫 OUT OF STOCK' : '⚠️ LOW STOCK';
        message += `${status}: **${item.item_name}**\n`;
        message += `   📦 ${item.quantity} remaining\n`;
        message += `   💰 Cost: ₦${(item.cost_price || 0).toLocaleString()}\n`;
        message += `   💲 Sell: ₦${(item.selling_price || 0).toLocaleString()}\n\n`;
    }

    await ctx.reply(message);
}

module.exports = { inventoryHandler, listInventory, lowStockAlert };