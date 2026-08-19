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
        console.log('🔍 [supplierHandler] Started');
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        // ✅ Get business
        let businesses = await businessRepo.findByUserId(user.id);
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
        console.log('🔍 [supplierHandler] Business ID:', businessId);

        // ✅ Handle callback query
        if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;
            console.log('🔍 [supplierHandler] Callback query:', data);
            await ctx.answerCbQuery();
            
            if (data === 'menu_suppliers') {
                await showSupplierMenu(ctx, telegramId);
                return;
            }
            
            await handleButtonClick(ctx, businessId, telegramId);
            return;
        }

        const state = session ? session.state : null;
        console.log('🔍 [supplierHandler] State:', state);

        if (state === 'SUPPLIER_CREATE_NAME') {
            await handleCreateSupplierName(ctx, businessId, telegramId);
            return;
        }

        if (state === 'SUPPLIER_CREATE_PHONE') {
            await handleCreateSupplierPhone(ctx, businessId, telegramId);
            return;
        }

        if (state === 'SUPPLIER_CREATE_EMAIL') {
            await handleCreateSupplierEmail(ctx, businessId, telegramId);
            return;
        }

        if (state === 'SUPPLIER_CREATE_ADDRESS') {
            await handleCreateSupplierAddress(ctx, businessId, telegramId);
            return;
        }

        if (state === 'SUPPLIER_CREATE_CONFIRM') {
            await handleCreateSupplierConfirm(ctx, businessId, telegramId);
            return;
        }

        if (state === 'SUPPLIER_VIEW_ID') {
            await handleViewSupplier(ctx, businessId, telegramId);
            return;
        }

        await showSupplierMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ Supplier handler error:', error.message);
        console.error('❌ Stack:', error.stack);
        logger.error('Supplier handler error:', {
            message: error.message,
            stack: error.stack
        });
        await ctx.reply(`❌ Error: ${error.message}`);
    }
}

async function showSupplierMenu(ctx, telegramId) {
    try {
        console.log('🔍 [showSupplierMenu] Started');
        sessionManager.clearSession(telegramId);

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
    } catch (error) {
        console.error('❌ [showSupplierMenu] Error:', error.message);
        throw error;
    }
}

// =============================================
// ADD SUPPLIER FLOW (With Confirmation)
// =============================================
async function handleCreateSupplierName(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;

        if (!text) {
            sessionManager.setState(telegramId, 'SUPPLIER_CREATE_NAME');
            await ctx.reply(
                `📝 **Add New Supplier**

Enter the supplier's full name:`
            );
            return;
        }

        const name = text.trim();
        if (name.length < 2) {
            await ctx.reply('⚠️ Please enter a valid name (at least 2 characters).');
            return;
        }

        // ✅ Check for existing supplier (case-insensitive)
        const existingSuppliers = await supplierRepo.findByBusinessId(businessId, {
            search: name,
            limit: 1,
        });

        const existing = existingSuppliers && existingSuppliers.length > 0
            ? existingSuppliers.find(s => s.name.toLowerCase() === name.toLowerCase())
            : null;

        if (existing) {
            await ctx.reply(`⚠️ Supplier "${name}" already exists. Please use a different name.`);
            return;
        }

        sessionManager.setData(telegramId, { name });
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_PHONE');

        await ctx.reply(
            `📝 **Supplier: ${name}**

Enter the supplier's **phone number** (or type "skip"):`
        );

    } catch (error) {
        console.error('❌ [handleCreateSupplierName] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateSupplierPhone(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('Please enter the phone number or type "skip":');
            return;
        }

        const phone = text.trim().toLowerCase() === 'skip' ? null : text.trim();
        sessionManager.setData(telegramId, { ...session.data, phone });
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_EMAIL');

        await ctx.reply(
            `📝 **Supplier: ${session.data.name}**
📞 Phone: ${phone || 'Not set'}

Enter the supplier's **email address** (or type "skip"):`
        );

    } catch (error) {
        console.error('❌ [handleCreateSupplierPhone] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateSupplierEmail(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('Please enter the email address or type "skip":');
            return;
        }

        const email = text.trim().toLowerCase() === 'skip' ? null : text.trim();
        sessionManager.setData(telegramId, { ...session.data, email });
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_ADDRESS');

        await ctx.reply(
            `📝 **Supplier: ${session.data.name}**
📞 Phone: ${session.data.phone || 'Not set'}
📧 Email: ${email || 'Not set'}

Enter the supplier's **address** (or type "skip"):`
        );

    } catch (error) {
        console.error('❌ [handleCreateSupplierEmail] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateSupplierAddress(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('Please enter the address or type "skip":');
            return;
        }

        const address = text.trim().toLowerCase() === 'skip' ? null : text.trim();
        sessionManager.setData(telegramId, { ...session.data, address });
        sessionManager.setState(telegramId, 'SUPPLIER_CREATE_CONFIRM');

        const data = session.data;
        let message =
            `📋 **Confirm Supplier Details**\n\n` +
            `📛 Name: ${data.name}\n` +
            `📞 Phone: ${data.phone || 'Not set'}\n` +
            `📧 Email: ${data.email || 'Not set'}\n` +
            `📍 Address: ${data.address || 'Not set'}\n\n` +
            `Reply with **YES** to confirm or **NO** to cancel.`;

        await ctx.reply(message);

    } catch (error) {
        console.error('❌ [handleCreateSupplierAddress] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateSupplierConfirm(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
            return;
        }

        const response = text.trim().toUpperCase();

        if (response === 'NO') {
            sessionManager.clearSession(telegramId);
            await ctx.reply('❌ Supplier creation cancelled.');
            await showSupplierMenu(ctx, telegramId);
            return;
        }

        if (response !== 'YES') {
            await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
            return;
        }

        const data = session.data;

        // ✅ Double-check for existing supplier (case-insensitive) before saving
        const existingSuppliers = await supplierRepo.findByBusinessId(businessId, {
            search: data.name,
            limit: 1,
        });

        const existing = existingSuppliers && existingSuppliers.length > 0
            ? existingSuppliers.find(s => s.name.toLowerCase() === data.name.toLowerCase())
            : null;

        if (existing) {
            await ctx.reply(`⚠️ Supplier "${data.name}" already exists.`);
            sessionManager.clearSession(telegramId);
            await showSupplierMenu(ctx, telegramId);
            return;
        }

        const result = await createSupplierUseCase.execute({
            businessId: businessId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
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
• Phone: ${supplier.phone || 'Not set'}
• Email: ${supplier.email || 'Not set'}
• Address: ${supplier.address || 'Not set'}

What would you like to do next?`,
            { parse_mode: 'Markdown' }
        );

        await showSupplierMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [handleCreateSupplierConfirm] Error:', error.message);
        await ctx.reply(`❌ Failed to create supplier: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

// =============================================
// VIEW SUPPLIER (Case-Insensitive)
// =============================================
async function handleViewSupplier(ctx, businessId, telegramId) {
    try {
        console.log('🔍 [handleViewSupplier] Started');
        const text = ctx.message?.text;

        if (!text) {
            sessionManager.setState(telegramId, 'SUPPLIER_VIEW_ID');
            await ctx.reply(
                `👤 **View Supplier**

Enter the supplier's ID or name:`
            );
            return;
        }

        let supplier;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            supplier = await supplierRepo.findById(id);
        } else {
            // ✅ Case-insensitive search
            const suppliers = await supplierRepo.findByBusinessId(businessId, {
                search: text,
                limit: 10,
            });
            
            // Find exact match (case-insensitive)
            if (suppliers && suppliers.length > 0) {
                supplier = suppliers.find(s => s.name.toLowerCase() === text.toLowerCase()) || suppliers[0];
            }
        }

        if (!supplier) {
            await ctx.reply(`❌ Supplier "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showSupplierMenu(ctx, telegramId);
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
        console.error('❌ [handleViewSupplier] Error:', error.message);
        logger.error('View supplier error:', error);
        await ctx.reply(`❌ Failed to view supplier: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

// =============================================
// LIST SUPPLIERS
// =============================================
async function listSuppliers(ctx, businessId, telegramId) {
    try {
        console.log('🔍 [listSuppliers] Started');
        const result = await getSuppliersUseCase.execute({
            businessId: businessId,
            limit: 50,
        });

        if (!result || !result.success || result.suppliers.length === 0) {
            await ctx.reply('📋 **No suppliers found.**\n\nAdd your first supplier using the Add Supplier button.');
            return;
        }

        let message = `📋 **Supplier List (${result.total})**\n\n`;

        for (const supplier of result.suppliers.slice(0, 20)) {
            message += `🆔 ${supplier.id} — **${supplier.name}**\n`;
            if (supplier.phone) message += `   📞 ${supplier.phone}\n`;
            if (supplier.email) message += `   📧 ${supplier.email}\n`;
            message += `\n`;
        }

        if (result.suppliers.length > 20) {
            message += `... and ${result.total - 20} more suppliers.\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await showSupplierMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [listSuppliers] Error:', error.message);
        logger.error('List suppliers error:', error);
        await ctx.reply(`❌ Failed to list suppliers: ${error.message}`);
    }
}

// =============================================
// HANDLE BUTTON CLICKS
// =============================================
async function handleButtonClick(ctx, businessId, telegramId) {
    try {
        const data = ctx.callbackQuery?.data;
        console.log('🔍 [handleButtonClick] Data:', data);

        if (data === 'supplier_create') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'SUPPLIER_CREATE_NAME');
            await ctx.reply(
                `📝 **Add New Supplier**

Enter the supplier's full name:`
            );
            return;
        }

        if (data === 'supplier_view') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'SUPPLIER_VIEW_ID');
            await ctx.reply(
                `👤 **View Supplier**

Enter the supplier's ID or name:`
            );
            return;
        }

        if (data === 'supplier_list') {
            await listSuppliers(ctx, businessId, telegramId);
            return;
        }

        if (data === 'supplier_back') {
            await showSupplierMenu(ctx, telegramId);
            return;
        }

        if (data === 'back_main') {
            const { startHandler } = require('./startHandler');
            await startHandler(ctx);
            return;
        }

        await showSupplierMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [handleButtonClick] Error:', error.message);
        throw error;
    }
}

module.exports = {
    supplierHandler,
    showSupplierMenu,
    handleCreateSupplierName,
    handleCreateSupplierPhone,
    handleCreateSupplierEmail,
    handleCreateSupplierAddress,
    handleCreateSupplierConfirm,
    handleViewSupplier,
    listSuppliers,
};