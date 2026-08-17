// index.js - Main Entry Point
require('dotenv').config();

const { getBotInstance } = require('./src/interfaces/telegram/bot');
const { getSessionManager } = require('./src/interfaces/telegram/sessionManager');
const { startHandler, helpHandler, cancelHandler } = require('./src/interfaces/telegram/handlers/startHandler');
const onboardingHandler = require('./src/interfaces/telegram/handlers/onboardingHandler');
const { loginHandler } = require('./src/interfaces/telegram/handlers/authHandler');
const dashboardHandler = require('./src/interfaces/telegram/handlers/dashboardHandler');
const saleHandler = require('./src/interfaces/telegram/handlers/saleHandler');
const incomeHandler = require('./src/interfaces/telegram/handlers/incomeHandler');
const expenseHandler = require('./src/interfaces/telegram/handlers/expenseHandler');
const { inventoryHandler, listInventory, lowStockAlert } = require('./src/interfaces/telegram/handlers/inventoryHandler');
const { debtorHandler, listDebtors, overdueDebtors } = require('./src/interfaces/telegram/handlers/debtorHandler');
const { creditorHandler, listCreditors, overdueCreditors } = require('./src/interfaces/telegram/handlers/creditorHandler');
const reportHandler = require('./src/interfaces/telegram/handlers/reportHandler');
const { INDUSTRIES } = require('./src/config/industries');
const SetupBusinessUseCase = require('./src/application/useCases/onboarding/SetupBusinessUseCase');
const UserRepository = require('./src/infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('./src/infrastructure/database/sqlite/repositories/BusinessRepository');

console.log('=====================================');
console.log('🏢 AI CFO ENTERPRISE');
console.log('🚀 Phase 2 - Complete Business Modules');
console.log('=====================================');

// =============================================
// INITIALIZE REPOSITORIES FOR CALLBACK HANDLER
// =============================================
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const setupUseCase = new SetupBusinessUseCase(userRepo, businessRepo);

// =============================================
// GET BOT INSTANCE
// =============================================
const bot = getBotInstance();
const botInstance = bot.getBot();

// =============================================
// REGISTER COMMANDS
// =============================================
botInstance.start(startHandler);
botInstance.command('help', helpHandler);
botInstance.command('cancel', cancelHandler);
botInstance.command('login', loginHandler);
botInstance.command('dashboard', dashboardHandler);
botInstance.command('sale', saleHandler);
botInstance.command('income', incomeHandler);
botInstance.command('expense', expenseHandler);
botInstance.command('inventory', inventoryHandler);
botInstance.command('inventory_list', listInventory);
botInstance.command('inventory_low', lowStockAlert);
botInstance.command('debtors', debtorHandler);
botInstance.command('debtors_list', listDebtors);
botInstance.command('debtors_overdue', overdueDebtors);
botInstance.command('creditors', creditorHandler);
botInstance.command('creditors_list', listCreditors);
botInstance.command('creditors_overdue', overdueCreditors);
botInstance.command('reports', reportHandler);

// =============================================
// TEXT HANDLER - Routes to appropriate handler
// =============================================
botInstance.on('text', async (ctx) => {
    const telegramId = ctx.from.id;
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(telegramId);
    const text = ctx.message ? ctx.message.text : '';

    // Ignore commands (they start with /)
    if (text.startsWith('/')) {
        return;
    }

    // If user is in login flow, route to loginHandler
    if (session && (session.state === 'LOGIN_WAITING_IDENTIFIER' || session.state === 'LOGIN_WAITING_PASSWORD')) {
        await loginHandler(ctx);
        return;
    }

    // If user is in onboarding flow, route to onboardingHandler
    if (session && session.state && session.state.startsWith('WAITING_FOR_')) {
        await onboardingHandler(ctx);
        return;
    }

    // If user is in sale flow, route to saleHandler
    if (session && session.state && session.state.startsWith('SALE_WAITING_')) {
        await saleHandler(ctx);
        return;
    }

    // If user is in inventory flow, route to inventoryHandler
    if (session && session.state && session.state.startsWith('INVENTORY_WAITING_')) {
        await inventoryHandler(ctx);
        return;
    }

    // If user is in debtor flow, route to debtorHandler
    if (session && session.state && session.state.startsWith('DEBTOR_WAITING_')) {
        await debtorHandler(ctx);
        return;
    }

    // If user is in creditor flow, route to creditorHandler
    if (session && session.state && session.state.startsWith('CREDITOR_WAITING_')) {
        await creditorHandler(ctx);
        return;
    }

    // If user is in income flow, route to incomeHandler
    if (session && session.state && session.state.startsWith('INCOME_WAITING_')) {
        await incomeHandler(ctx);
        return;
    }

    // If user is in expense flow, route to expenseHandler
    if (session && session.state && session.state.startsWith('EXPENSE_WAITING_')) {
        await expenseHandler(ctx);
        return;
    }

    // Default: show help
    await ctx.reply('Type /help for available commands.');
});

// =============================================
// CALLBACK QUERY HANDLER - ALL MENU BUTTONS
// =============================================
botInstance.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const telegramId = ctx.from.id;
        const sessionManager = getSessionManager();
        const session = sessionManager.getSession(telegramId);

        await ctx.answerCbQuery();

        // =============================================
        // DASHBOARD MENU CALLBACKS (HANDLED FIRST)
        // =============================================

        // Record Sale
        if (data === 'menu_sale') {
            await saleHandler(ctx);
            return;
        }

        // Income
        if (data === 'menu_income') {
            await incomeHandler(ctx);
            return;
        }

        // Expense
        if (data === 'menu_expense') {
            await expenseHandler(ctx);
            return;
        }

        // Inventory
        if (data === 'menu_inventory') {
            await inventoryHandler(ctx);
            return;
        }

        // Dashboard
        if (data === 'menu_dashboard') {
            await dashboardHandler(ctx);
            return;
        }

        // Debtors
        if (data === 'menu_debtors') {
            await debtorHandler(ctx);
            return;
        }

        // Creditors
        if (data === 'menu_creditors') {
            await creditorHandler(ctx);
            return;
        }

        // Reports
        if (data === 'menu_reports') {
            await reportHandler(ctx);
            return;
        }

        // Ask AI
        if (data === 'menu_ai') {
            await ctx.reply('🤖 **Ask AI**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Settings
        if (data === 'menu_settings') {
            await ctx.reply('⚙️ **Settings**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Production (Manufacturing)
        if (data === 'menu_production') {
            await ctx.reply('🏭 **Production Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Projects (Construction/Consultancy)
        if (data === 'menu_projects') {
            await ctx.reply('🏗️ **Projects Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Register Visit (Healthcare)
        if (data === 'menu_visit') {
            await ctx.reply('🩺 **Register Visit**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Properties (Real Estate)
        if (data === 'menu_properties') {
            await ctx.reply('🏠 **Properties Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Tenants (Real Estate)
        if (data === 'menu_tenants') {
            await ctx.reply('👥 **Tenants Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Students (Education)
        if (data === 'menu_students') {
            await ctx.reply('📚 **Students Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Vehicles (Logistics)
        if (data === 'menu_vehicles') {
            await ctx.reply('🚗 **Vehicles Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Log Hours (Consultancy)
        if (data === 'menu_loghours') {
            await ctx.reply('⏰ **Log Hours**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Clients (Consultancy)
        if (data === 'menu_clients') {
            await ctx.reply('👥 **Clients Module**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Record Rent (Real Estate)
        if (data === 'menu_rent') {
            await ctx.reply('💰 **Record Rent**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Record Fees (Education)
        if (data === 'menu_fees') {
            await ctx.reply('💰 **Record Fees**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // Record Trip (Logistics)
        if (data === 'menu_trip') {
            await ctx.reply('🚛 **Record Trip**\n\nFeature coming soon in Phase 3!');
            return;
        }

        // =============================================
        // INDUSTRY SELECTION (Onboarding)
        // =============================================
        if (data && data.startsWith('industry_')) {
            // Only process if user is in onboarding
            if (!session || session.state !== 'WAITING_FOR_INDUSTRY') {
                await ctx.reply('Please complete the previous steps first.');
                return;
            }

            const industryId = data.replace('industry_', '');
            const industry = INDUSTRIES[industryId];
            
            if (!industry) {
                await ctx.reply(`❌ Invalid industry selected: ${industryId}`);
                return;
            }

            const userData = session.data;

            try {
                const result = await setupUseCase.execute({
                    telegramId: telegramId,
                    fullName: userData.fullName,
                    email: userData.email,
                    phoneNumber: userData.phone,
                    password: userData.password,
                    businessName: userData.businessName,
                    industry: industryId,
                });

                sessionManager.clearSession(telegramId);

                // Calculate trial end date
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);
                const formattedEndDate = trialEndDate.toLocaleDateString('en-NG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });

                // Build industry-specific quick actions
                let quickActions = '';
                if (industry.features.inventory) {
                    quickActions += `/sale - Record a sale\n`;
                    quickActions += `/inventory - Manage inventory\n`;
                }
                quickActions += `/dashboard - View dashboard\n`;
                quickActions += `/help - See all commands`;

                const message =
                    `🎉 **Registration Complete!**\n\n` +
                    `🏢 Business: ${result.business.name}\n` +
                    `🏭 Industry: ${industry.icon} ${industry.name}\n` +
                    `👤 Owner: ${result.user.fullName}\n` +
                    `📧 Email: ${result.user.email}\n` +
                    `📱 Phone: ${result.user.phoneNumber}\n\n` +
                    `📋 **Your Free Plan is active!**\n` +
                    `• ✅ 30-day trial period\n` +
                    `• 📊 Track sales, inventory, and finances\n` +
                    `• 👥 Manage debtors and creditors\n\n` +
                    `⏳ **Trial ends:** ${formattedEndDate}\n\n` +
                    `📊 **Your Dashboard is ready!**\n` +
                    `Type /dashboard to view your business overview.\n\n` +
                    `📋 **Quick Actions for ${industry.icon} ${industry.name}:**\n` +
                    quickActions;

                await ctx.editMessageText(message, { parse_mode: 'Markdown' });

            } catch (error) {
                console.error('Registration error:', error);
                await ctx.reply(`❌ Registration failed: ${error.message}`);
            }
            return;
        }

        // If no callback matched, show help
        await ctx.reply('Type /help for available commands.');

    } catch (error) {
        console.error('Callback error:', error);
        await ctx.reply('❌ Something went wrong.');
    }
});

// =============================================
// ERROR HANDLING
// =============================================
botInstance.catch((err, ctx) => {
    console.error('Telegram error:', err);
});

// =============================================
// LAUNCH BOT
// =============================================
bot.launch().then(() => {
    console.log('✅ Bot is running!');
    console.log('📱 Send /start to register');
    console.log('🔐 Send /login to login');
    console.log('📊 Send /dashboard to view dashboard');
    console.log('📝 Send /sale to record a sale');
    console.log('💰 Send /income to record income');
    console.log('📉 Send /expense to record expense');
    console.log('📦 Send /inventory to manage inventory');
    console.log('👥 Send /debtors to manage debtors');
    console.log('🏦 Send /creditors to manage creditors');
    console.log('📋 Send /reports to generate reports');
    console.log('=====================================');
}).catch((error) => {
    console.error('❌ Failed to launch bot:', error);
    process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));