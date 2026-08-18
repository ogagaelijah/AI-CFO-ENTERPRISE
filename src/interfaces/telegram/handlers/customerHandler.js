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

        if (state === 'CUSTOMER_CREATE_NAME') {
            await handleCreateCustomer(ctx, business.id);
            return;
        }

        if (state === 'CUSTOMER_VIEW_ID') {
            await handleViewCustomer(ctx, business.id);
            return;
        }

        if (state === 'CUSTOMER_HISTORY_ID') {
            await handleViewCustomerHistory(ctx, business.id);
            return;
        }

        // Check if this is a button click
        if (ctx.callbackQuery) {
            await handleButtonClick(ctx, business.id);
            return;
        }

        await showCustomerMenu(ctx);

    } catch (error) {
        logger.error('Customer handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showCustomerMenu(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'CUSTOMER_MENU');

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
}

async function handleCreateCustomer(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'CUSTOMER_CREATE_NAME');
        await ctx.reply(
            `📝 **Add New Customer**

Enter the customer's full name:`
        );
        return;
    }

    try {
        const result = await createCustomerUseCase.execute({
            businessId,
            name: text,
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
• Type: ${customer.type}

What would you like to do next?`,
            { parse_mode: 'Markdown' }
        );

        await showCustomerMenu(ctx);

    } catch (error) {
        logger.error('Create customer error:', error);
        await ctx.reply(`❌ Failed to create customer: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function handleViewCustomer(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'CUSTOMER_VIEW_ID');
        await ctx.reply(
            `👤 **View Customer**

Enter the customer's ID or name:`
        );
        return;
    }

    try {
        let customer;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            const result = await getCustomerUseCase.execute({
                customerId: id,
                businessId,
            });
            if (result.success) {
                customer = result.customer;
            }
        } else {
            // Search by name
            const customers = await customerRepo.search(businessId, text, { limit: 1 });
            if (customers && customers.length > 0) {
                customer = customers[0];
            }
        }

        if (!customer) {
            await ctx.reply(`❌ Customer "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showCustomerMenu(ctx);
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

        // Show history option
        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 View History', callback_data: `customer_history_${customer.id}` }],
                    [{ text: '🔙 Back to Customers', callback_data: 'customer_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('View customer error:', error);
        await ctx.reply(`❌ Failed to view customer: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function handleViewCustomerHistory(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'CUSTOMER_HISTORY_ID');
        await ctx.reply(
            `📊 **Customer History**

Enter the customer's ID or name:`
        );
        return;
    }

    try {
        let customerId;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            customerId = id;
        } else {
            // Search by name
            const customers = await customerRepo.search(businessId, text, { limit: 1 });
            if (customers && customers.length > 0) {
                customerId = customers[0].id;
            }
        }

        if (!customerId) {
            await ctx.reply(`❌ Customer "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showCustomerMenu(ctx);
            return;
        }

        sessionManager.clearSession(telegramId);

        await ctx.reply('⏳ Loading customer history...');

        const result = await getCustomerHistoryUseCase.execute({
            customerId,
            businessId,
            limit: 20,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
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

        await showCustomerMenu(ctx);

    } catch (error) {
        logger.error('Customer history error:', error);
        await ctx.reply(`❌ Failed to load history: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function listCustomers(ctx, businessId) {
    try {
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

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Customer', callback_data: 'customer_create' }],
                    [{ text: '🔙 Back to Customers', callback_data: 'customer_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('List customers error:', error);
        await ctx.reply(`❌ Failed to list customers: ${error.message}`);
    }
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;
    const telegramId = ctx.from.id;

    await ctx.answerCallbackQuery();

    if (data === 'customer_create') {
        sessionManager.setState(telegramId, 'CUSTOMER_CREATE_NAME');
        await ctx.reply(
            `📝 **Add New Customer**

Enter the customer's full name:`
        );
        return;
    }

    if (data === 'customer_view') {
        sessionManager.setState(telegramId, 'CUSTOMER_VIEW_ID');
        await ctx.reply(
            `👤 **View Customer**

Enter the customer's ID or name:`
        );
        return;
    }

    if (data === 'customer_history') {
        sessionManager.setState(telegramId, 'CUSTOMER_HISTORY_ID');
        await ctx.reply(
            `📊 **Customer History**

Enter the customer's ID or name:`
        );
        return;
    }

    if (data === 'customer_list') {
        await listCustomers(ctx, businessId);
        return;
    }

    if (data === 'customer_back') {
        await showCustomerMenu(ctx);
        return;
    }

    if (data === 'back_main') {
        const { startHandler } = require('./startHandler');
        await startHandler(ctx);
        return;
    }

    // Handle customer history from inline button
    if (data && data.startsWith('customer_history_')) {
        const customerId = parseInt(data.replace('customer_history_', ''));
        if (!isNaN(customerId)) {
            await ctx.reply('⏳ Loading customer history...');
            const result = await getCustomerHistoryUseCase.execute({
                customerId,
                businessId,
                limit: 20,
            });

            if (!result.success) {
                await ctx.reply(`❌ ${result.message}`);
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
            await showCustomerMenu(ctx);
        }
    }
}

module.exports = {
    customerHandler,
    showCustomerMenu,
    handleCreateCustomer,
    handleViewCustomer,
    handleViewCustomerHistory,
    listCustomers,
};