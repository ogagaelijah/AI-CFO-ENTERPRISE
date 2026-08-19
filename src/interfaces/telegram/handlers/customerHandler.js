// src/interfaces/telegram/handlers/customerHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreateCustomerUseCase = require('../../../application/useCases/customers/CreateCustomerUseCase');
const GetCustomerUseCase = require('../../../application/useCases/customers/GetCustomerUseCase');
const GetCustomerHistoryUseCase = require('../../../application/useCases/customers/GetCustomerHistoryUseCase');
const { getMainMenuKeyboard, getCustomerKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const customerRepo = new CustomerRepository();
const saleRepo = new SaleRepository();
const debtorRepo = new DebtorRepository();

const createCustomerUseCase = new CreateCustomerUseCase({
    customerRepository: customerRepo,
});

const getCustomerUseCase = new GetCustomerUseCase({
    customerRepository: customerRepo,
});

const getCustomerHistoryUseCase = new GetCustomerHistoryUseCase({
    customerRepository: customerRepo,
    saleRepository: saleRepo,
    debtorRepository: debtorRepo,
});

async function customerHandler(ctx) {
    try {
        console.log('🔍 [customerHandler] Started');
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        // ✅ FIX: Handle business lookup properly
        let businesses = await businessRepo.findByUserId(user.id);
        console.log('🔍 [customerHandler] Raw businesses:', JSON.stringify(businesses, null, 2));

        // If businesses is an array, get the first one
        let business = null;
        if (Array.isArray(businesses) && businesses.length > 0) {
            business = businesses[0];
        } else if (businesses && !Array.isArray(businesses)) {
            business = businesses;
        }

        // ✅ If no business found, try to create one or use default
        if (!business) {
            console.log('🔍 [customerHandler] No business found, attempting to create...');
            // Try to create a default business
            try {
                const Business = require('../../../domain/entities/Business');
                const newBusiness = new Business({
                    userId: user.id,
                    name: `${user.fullName}'s Business`,
                    industry: 'RETAIL',
                    categories: {},
                    features: {},
                    setupCompleted: true,
                });
                business = await businessRepo.create(newBusiness);
                console.log('✅ Created new business:', business.id);
            } catch (createError) {
                console.error('Failed to create business:', createError.message);
                await ctx.reply('⚠️ Please set up your business first. Type /start');
                return;
            }
        }

        const businessId = business ? business.id : null;
        console.log('🔍 [customerHandler] Business ID:', businessId);

        if (!businessId) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await handleButtonClick(ctx, businessId, telegramId);
            return;
        }

        const state = session ? session.state : null;
        console.log('🔍 [customerHandler] State:', state);

        switch (state) {
            case 'CUSTOMER_CREATE_NAME':
                await handleCreateCustomerName(ctx, businessId, telegramId);
                break;
            case 'CUSTOMER_CREATE_PHONE':
                await handleCreateCustomerPhone(ctx, businessId, telegramId);
                break;
            case 'CUSTOMER_CREATE_EMAIL':
                await handleCreateCustomerEmail(ctx, businessId, telegramId);
                break;
            case 'CUSTOMER_CREATE_CONFIRM':
                await handleCreateCustomerConfirm(ctx, businessId, telegramId);
                break;
            case 'CUSTOMER_VIEW_ID':
                await handleViewCustomer(ctx, businessId, telegramId);
                break;
            case 'CUSTOMER_HISTORY_ID':
                await handleViewCustomerHistory(ctx, businessId, telegramId);
                break;
            default:
                await showCustomerMenu(ctx, telegramId);
                break;
        }

    } catch (error) {
        console.error('❌ Customer handler error:', error.message);
        console.error('❌ Stack:', error.stack);
        logger.error('Customer handler error:', {
            message: error.message,
            stack: error.stack
        });
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showCustomerMenu(ctx, telegramId) {
    try {
        console.log('🔍 [showCustomerMenu] Started');
        sessionManager.clearSession(telegramId);

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Customer', callback_data: 'customer_create' }],
                    [{ text: '👤 View Customer', callback_data: 'customer_view' }],
                    [{ text: '📋 List All Customers', callback_data: 'customer_list' }],
                    [{ text: '📊 Customer History', callback_data: 'customer_history' }],
                    [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
                ],
            },
        };

        await ctx.reply(
            `👤 **Customer Management**

Manage your customers, patients, clients, tenants, or students.

• **Add Customer** — Create a new customer
• **View Customer** — View customer details
• **List All** — See all customers
• **Customer History** — View transaction history

Select an option below:`,
            { parse_mode: 'Markdown', ...keyboard }
        );
    } catch (error) {
        console.error('❌ [showCustomerMenu] Error:', error.message);
        throw error;
    }
}

// =============================================
// ADD CUSTOMER FLOW (With Confirmation)
// =============================================
async function handleCreateCustomerName(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;

        if (!text) {
            sessionManager.setState(telegramId, 'CUSTOMER_CREATE_NAME');
            await ctx.reply(
                `📝 **Add New Customer**

Enter the customer's full name:`
            );
            return;
        }

        const name = text.trim();
        if (name.length < 2) {
            await ctx.reply('⚠️ Please enter a valid name (at least 2 characters).');
            return;
        }

        sessionManager.setData(telegramId, { name });
        sessionManager.setState(telegramId, 'CUSTOMER_CREATE_PHONE');

        await ctx.reply(
            `📝 **Customer: ${name}**

Enter the customer's **phone number** (or type "skip"):`
        );

    } catch (error) {
        console.error('❌ [handleCreateCustomerName] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateCustomerPhone(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('Please enter the phone number or type "skip":');
            return;
        }

        const phone = text.trim().toLowerCase() === 'skip' ? null : text.trim();
        sessionManager.setData(telegramId, { ...session.data, phone });
        sessionManager.setState(telegramId, 'CUSTOMER_CREATE_EMAIL');

        await ctx.reply(
            `📝 **Customer: ${session.data.name}**
📞 Phone: ${phone || 'Not set'}

Enter the customer's **email address** (or type "skip"):`
        );

    } catch (error) {
        console.error('❌ [handleCreateCustomerPhone] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateCustomerEmail(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;
        const session = sessionManager.getSession(telegramId);

        if (!text) {
            await ctx.reply('Please enter the email address or type "skip":');
            return;
        }

        const email = text.trim().toLowerCase() === 'skip' ? null : text.trim();
        sessionManager.setData(telegramId, { ...session.data, email });
        sessionManager.setState(telegramId, 'CUSTOMER_CREATE_CONFIRM');

        const data = session.data;
        let message =
            `📋 **Confirm Customer Details**\n\n` +
            `📛 Name: ${data.name}\n` +
            `📞 Phone: ${data.phone || 'Not set'}\n` +
            `📧 Email: ${data.email || 'Not set'}\n\n` +
            `Reply with **YES** to confirm or **NO** to cancel.`;

        await ctx.reply(message);

    } catch (error) {
        console.error('❌ [handleCreateCustomerEmail] Error:', error.message);
        await ctx.reply(`❌ Failed: ${error.message}`);
    }
}

async function handleCreateCustomerConfirm(ctx, businessId, telegramId) {
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
            await ctx.reply('❌ Customer creation cancelled.');
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        if (response !== 'YES') {
            await ctx.reply('⚠️ Please reply with **YES** or **NO**.');
            return;
        }

        const data = session.data;

        // Check if customer already exists (case-insensitive)
        const existingCustomers = await customerRepo.findByBusinessId(businessId, {
            search: data.name,
            limit: 1,
        });

        const existing = existingCustomers.find(c => 
            c.name.toLowerCase() === data.name.toLowerCase()
        );

        if (existing) {
            await ctx.reply(`⚠️ Customer "${data.name}" already exists.`);
            sessionManager.clearSession(telegramId);
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        const result = await createCustomerUseCase.execute({
            businessId: businessId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            type: 'CUSTOMER',
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
            return;
        }

        sessionManager.clearSession(telegramId);

        const customer = result.customer;
        await ctx.reply(
            `✅ **Customer Added Successfully!**

📋 **Details:**
• Name: ${customer.name}
• ID: ${customer.id}
• Phone: ${customer.phone || 'Not set'}
• Email: ${customer.email || 'Not set'}
• Type: ${customer.type}

What would you like to do next?`,
            { parse_mode: 'Markdown' }
        );

        await showCustomerMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [handleCreateCustomerConfirm] Error:', error.message);
        await ctx.reply(`❌ Failed to create customer: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

// =============================================
// VIEW CUSTOMER
// =============================================
async function handleViewCustomer(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;

        if (!text) {
            sessionManager.setState(telegramId, 'CUSTOMER_VIEW_ID');
            await ctx.reply(
                `👤 **View Customer**

Enter the customer's ID or name:`
            );
            return;
        }

        let customer;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            const result = await getCustomerUseCase.execute({
                customerId: id,
                businessId: businessId,
            });
            if (result.success) {
                customer = result.customer;
            }
        } else {
            const customers = await customerRepo.findByBusinessId(businessId, {
                search: text,
                limit: 1,
            });
            if (customers && customers.length > 0) {
                customer = customers.find(c => 
                    c.name.toLowerCase() === text.toLowerCase()
                ) || customers[0];
            }
        }

        if (!customer) {
            await ctx.reply(`❌ Customer "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        sessionManager.clearSession(telegramId);

        let message = `👤 **Customer Details**\n\n`;
        message += `📋 **ID:** ${customer.id}\n`;
        message += `📛 **Name:** ${customer.name}\n`;
        message += `📞 **Phone:** ${customer.phone || 'Not set'}\n`;
        message += `📧 **Email:** ${customer.email || 'Not set'}\n`;
        message += `📍 **Address:** ${customer.address || 'Not set'}\n`;
        message += `🏷️ **Type:** ${customer.type}\n`;
        message += `📝 **Notes:** ${customer.notes || 'None'}\n`;
        message += `📅 **Created:** ${new Date(customer.createdAt).toLocaleDateString()}\n`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 View History', callback_data: `customer_history_${customer.id}` }],
                    [{ text: '🔙 Back to Customers', callback_data: 'customer_back' }],
                ],
            },
        });

    } catch (error) {
        console.error('❌ [handleViewCustomer] Error:', error.message);
        await ctx.reply(`❌ Failed to view customer: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

// =============================================
// CUSTOMER HISTORY
// =============================================
async function handleViewCustomerHistory(ctx, businessId, telegramId) {
    try {
        const text = ctx.message?.text;

        if (!text) {
            sessionManager.setState(telegramId, 'CUSTOMER_HISTORY_ID');
            await ctx.reply(
                `📊 **Customer History**

Enter the customer's ID or name:`
            );
            return;
        }

        let customerId;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            customerId = id;
        } else {
            const customers = await customerRepo.findByBusinessId(businessId, {
                search: text,
                limit: 1,
            });
            if (customers && customers.length > 0) {
                customerId = customers[0].id;
            }
        }

        if (!customerId) {
            await ctx.reply(`❌ Customer "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        sessionManager.clearSession(telegramId);

        await ctx.reply('⏳ Loading customer history...');

        const result = await getCustomerHistoryUseCase.execute({
            customerId: customerId,
            businessId: businessId,
            limit: 20,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        const summary = result.summary;
        let message = `📊 **Customer History: ${result.customer.name}**\n\n`;
        message += `📋 **Summary**\n`;
        message += `• Total Sales: ${summary.totalSales}\n`;
        message += `• Total Amount: ₦${summary.totalAmount.toLocaleString()}\n`;
        message += `• Total Paid: ₦${summary.totalPaid.toLocaleString()}\n`;
        message += `• Total Unpaid: ₦${summary.totalUnpaid.toLocaleString()}\n`;
        message += `• Outstanding Debt: ₦${summary.outstandingDebt.toLocaleString()}\n`;
        message += `• Overdue Debt: ₦${summary.overdueDebt.toLocaleString()}\n`;

        if (result.recentSales && result.recentSales.length > 0) {
            message += `\n📋 **Recent Transactions:**\n`;
            for (const sale of result.recentSales.slice(0, 5)) {
                message += `• ₦${sale.totalAmount.toLocaleString()} — ${new Date(sale.saleDate).toLocaleDateString()}\n`;
            }
            if (result.recentSales.length > 5) {
                message += `... and ${result.recentSales.length - 5} more.\n`;
            }
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await showCustomerMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [handleViewCustomerHistory] Error:', error.message);
        await ctx.reply(`❌ Failed to load history: ${error.message}`);
        sessionManager.clearSession(telegramId);
        await showCustomerMenu(ctx, telegramId);
    }
}

// =============================================
// LIST CUSTOMERS
// =============================================
async function listCustomers(ctx, businessId, telegramId) {
    try {
        console.log('🔍 [listCustomers] Started');
        const customers = await customerRepo.findByBusinessId(businessId, { limit: 50 });

        if (customers.length === 0) {
            await ctx.reply('📋 **No customers found.**\n\nAdd your first customer using the Add Customer button.');
            return;
        }

        let message = `📋 **Customer List (${customers.length})**\n\n`;

        for (const customer of customers.slice(0, 20)) {
            message += `🆔 ${customer.id} — **${customer.name}**\n`;
            if (customer.phone) message += `   📞 ${customer.phone}\n`;
            message += `   🏷️ ${customer.type}\n\n`;
        }

        if (customers.length > 20) {
            message += `... and ${customers.length - 20} more customers.\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await showCustomerMenu(ctx, telegramId);

    } catch (error) {
        console.error('❌ [listCustomers] Error:', error.message);
        await ctx.reply(`❌ Failed to list customers: ${error.message}`);
    }
}

// =============================================
// HANDLE BUTTON CLICKS
// =============================================
async function handleButtonClick(ctx, businessId, telegramId) {
    try {
        const data = ctx.callbackQuery?.data;

        console.log('🔍 [handleButtonClick] Data:', data);

        if (data === 'menu_customers') {
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        if (data === 'customer_create') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'CUSTOMER_CREATE_NAME');
            await ctx.reply(
                `📝 **Add New Customer**

Enter the customer's full name:`
            );
            return;
        }

        if (data === 'customer_view') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'CUSTOMER_VIEW_ID');
            await ctx.reply(
                `👤 **View Customer**

Enter the customer's ID or name:`
            );
            return;
        }

        if (data === 'customer_history') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'CUSTOMER_HISTORY_ID');
            await ctx.reply(
                `📊 **Customer History**

Enter the customer's ID or name:`
            );
            return;
        }

        if (data === 'customer_list') {
            await listCustomers(ctx, businessId, telegramId);
            return;
        }

        if (data === 'customer_back') {
            await showCustomerMenu(ctx, telegramId);
            return;
        }

        if (data === 'back_main') {
            const { startHandler } = require('./startHandler');
            await startHandler(ctx);
            return;
        }

        if (data && data.startsWith('customer_history_')) {
            const customerId = parseInt(data.replace('customer_history_', ''));
            if (!isNaN(customerId)) {
                await ctx.reply('⏳ Loading customer history...');
                const result = await getCustomerHistoryUseCase.execute({
                    customerId: customerId,
                    businessId: businessId,
                    limit: 20,
                });

                if (!result.success) {
                    await ctx.reply(`❌ ${result.message}`);
                    await showCustomerMenu(ctx, telegramId);
                    return;
                }

                const summary = result.summary;
                let message = `📊 **Customer History: ${result.customer.name}**\n\n`;
                message += `📋 **Summary**\n`;
                message += `• Total Sales: ${summary.totalSales}\n`;
                message += `• Total Amount: ₦${summary.totalAmount.toLocaleString()}\n`;
                message += `• Total Paid: ₦${summary.totalPaid.toLocaleString()}\n`;
                message += `• Total Unpaid: ₦${summary.totalUnpaid.toLocaleString()}\n`;
                message += `• Outstanding Debt: ₦${summary.outstandingDebt.toLocaleString()}\n`;
                message += `• Overdue Debt: ₦${summary.overdueDebt.toLocaleString()}\n`;

                if (result.recentSales && result.recentSales.length > 0) {
                    message += `\n📋 **Recent Transactions:**\n`;
                    for (const sale of result.recentSales.slice(0, 5)) {
                        message += `• ₦${sale.totalAmount.toLocaleString()} — ${new Date(sale.saleDate).toLocaleDateString()}\n`;
                    }
                    if (result.recentSales.length > 5) {
                        message += `... and ${result.recentSales.length - 5} more.\n`;
                    }
                }

                await ctx.reply(message, { parse_mode: 'Markdown' });
                await showCustomerMenu(ctx, telegramId);
            }
        }
    } catch (error) {
        console.error('❌ [handleButtonClick] Error:', error.message);
        throw error;
    }
}

module.exports = {
    customerHandler,
    showCustomerMenu,
    handleCreateCustomerName,
    handleCreateCustomerPhone,
    handleCreateCustomerEmail,
    handleCreateCustomerConfirm,
    handleViewCustomer,
    handleViewCustomerHistory,
    listCustomers,
};