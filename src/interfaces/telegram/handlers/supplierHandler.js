// src/interfaces/telegram/handlers/supplierHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const CreateSupplierUseCase = require('../../../application/useCases/suppliers/CreateSupplierUseCase');
const GetSuppliersUseCase = require('../../../application/useCases/suppliers/GetSuppliersUseCase');
const { getMainMenuKeyboard, getSupplierKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const supplierRepo = new SupplierRepository();

const createSupplierUseCase = new CreateSupplierUseCase({
    supplierRepository: supplierRepo,
});

const getSuppliersUseCase = new GetSuppliersUseCase({
    supplierRepository: supplierRepo,
});

async function supplierHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const business = await businessRepo.findByUserId(user.id);
        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        const state = session ? session.state : null;

        if (state === 'SUPPLIER_CREATE_NAME') {
            await handleCreateSupplier(ctx, business.id);
            return;
        }

        if (state === 'SUPPLIER_VIEW_ID') {
            await handleViewSupplier(ctx, business.id);
            return;
        }

        if (ctx.callbackQuery) {
            await handleButtonClick(ctx, business.id);
            return;
        }

        await showSupplierMenu(ctx);

    } catch (error) {
        logger.error('Supplier handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showSupplierMenu(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'SUPPLIER_MENU');

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Add Supplier', callback_data: 'supplier_create' }],
                [{ text: '👤 View Supplier', callback_data: 'supplier_view' }],
                [{ text: '📋 List All Suppliers', callback_data: 'supplier_list' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
            ],
        },
    };

    await ctx.reply(
        `🏢 **Supplier Management**

Manage your suppliers and vendors.

• **Add Supplier** — Create a new supplier
• **View Supplier** — View supplier details
• **List All** — See all suppliers

Select an option below:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handleCreateSupplier(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_NAME');
        await ctx.reply(
            `📝 **Add New Supplier**

Enter the supplier's full name:`
        );
        return;
    }

    try {
        const result = await createSupplierUseCase.execute({
            businessId,
            name: text,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
            return;
        }

        sessionManager.clearSession(telegramId);

        const supplier = result.supplier;
        await ctx.reply(
            `✅ **Supplier Added Successfully!**

📋 **Details:**
• Name: ${supplier.name}
• ID: ${supplier.id}

What would you like to do next?`,
            { parse_mode: 'Markdown' }
        );

        await showSupplierMenu(ctx);

    } catch (error) {
        logger.error('Create supplier error:', error);
        await ctx.reply(`❌ Failed to create supplier: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function handleViewSupplier(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'SUPPLIER_VIEW_ID');
        await ctx.reply(
            `👤 **View Supplier**

Enter the supplier's ID or name:`
        );
        return;
    }

    try {
        let supplier;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            supplier = await supplierRepo.findById(id);
        } else {
            const suppliers = await supplierRepo.search(businessId, text, { limit: 1 });
            if (suppliers && suppliers.length > 0) {
                supplier = suppliers[0];
            }
        }

        if (!supplier) {
            await ctx.reply(`❌ Supplier "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showSupplierMenu(ctx);
            return;
        }

        sessionManager.clearSession(telegramId);

        let message = `🏢 **Supplier Details**\n\n`;
        message += `📋 **ID:** ${supplier.id}\n`;
        message += `📛 **Name:** ${supplier.name}\n`;
        message += `📞 **Phone:** ${supplier.phone || 'Not set'}\n`;
        message += `📧 **Email:** ${supplier.email || 'Not set'}\n`;
        message += `📍 **Address:** ${supplier.address || 'Not set'}\n`;
        message += `📝 **Notes:** ${supplier.notes || 'None'}\n`;
        message += `📅 **Created:** ${new Date(supplier.createdAt).toLocaleDateString()}\n`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Suppliers', callback_data: 'supplier_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('View supplier error:', error);
        await ctx.reply(`❌ Failed to view supplier: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function listSuppliers(ctx, businessId) {
    try {
        const result = await getSuppliersUseCase.execute({
            businessId,
            limit: 50,
        });

        if (!result.success || result.suppliers.length === 0) {
            await ctx.reply('📋 **No suppliers found.**\n\nAdd your first supplier using the Add Supplier button.');
            return;
        }

        let message = `📋 **Supplier List (${result.total})**\n\n`;

        for (const supplier of result.suppliers.slice(0, 20)) {
            message += `🆔 ${supplier.id} — **${supplier.name}**\n`;
            if (supplier.phone) message += `   📞 ${supplier.phone}\n`;
            message += `\n`;
        }

        if (result.suppliers.length > 20) {
            message += `... and ${result.total - 20} more suppliers.\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Supplier', callback_data: 'supplier_create' }],
                    [{ text: '🔙 Back to Suppliers', callback_data: 'supplier_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('List suppliers error:', error);
        await ctx.reply(`❌ Failed to list suppliers: ${error.message}`);
    }
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;
    const telegramId = ctx.from.id;

    await ctx.answerCallbackQuery();

    if (data === 'supplier_create') {
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_NAME');
        await ctx.reply(
            `📝 **Add New Supplier**

Enter the supplier's full name:`
        );
        return;
    }

    if (data === 'supplier_view') {
        sessionManager.setState(telegramId, 'SUPPLIER_VIEW_ID');
        await ctx.reply(
            `👤 **View Supplier**

Enter the supplier's ID or name:`
        );
        return;
    }

    if (data === 'supplier_list') {
        await listSuppliers(ctx, businessId);
        return;
    }

    if (data === 'supplier_back') {
        await showSupplierMenu(ctx);
        return;
    }

    if (data === 'back_main') {
        const { startHandler } = require('./startHandler');
        await startHandler(ctx);
        return;
    }
}

module.exports = {
    supplierHandler,
    showSupplierMenu,
    handleCreateSupplier,
    handleViewSupplier,
    listSuppliers,
};