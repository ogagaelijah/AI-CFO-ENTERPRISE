// index.js - Main Entry Point
require('dotenv').config();

const { getBotInstance } = require('./src/interfaces/telegram/bot');
const { getSessionManager } = require('./src/interfaces/telegram/sessionManager');
const { startHandler, helpHandler, cancelHandler } = require('./src/interfaces/telegram/handlers/startHandler');
const onboardingHandler = require('./src/interfaces/telegram/handlers/onboardingHandler');
const { loginHandler } = require('./src/interfaces/telegram/handlers/authHandler');
const dashboardHandler = require('./src/interfaces/telegram/handlers/dashboardHandler');
const saleHandler = require('./src/interfaces/telegram/handlers/saleHandler');
const { incomeHandler, startIncomeFlow, listIncome, incomeSummary, incomeToday } = require('./src/interfaces/telegram/handlers/incomeHandler');
const { expenseHandler, startExpenseFlow, listExpenses, expenseSummary, expenseToday } = require('./src/interfaces/telegram/handlers/expenseHandler');
const { inventoryHandler, listInventory, lowStockAlert, inventoryValue } = require('./src/interfaces/telegram/handlers/inventoryHandler');
const { debtorHandler, listDebtors, overdueDebtors } = require('./src/interfaces/telegram/handlers/debtorHandler');
const { creditorHandler, listCreditors, overdueCreditors } = require('./src/interfaces/telegram/handlers/creditorHandler');
const { purchaseHandler, startPurchaseFlow, listPurchases, purchaseSummary, purchaseToday } = require('./src/interfaces/telegram/handlers/purchaseHandler');
const { reportHandler, reportCallbackHandler } = require('./src/interfaces/telegram/handlers/reportHandler');
const forecastHandler = require('./src/interfaces/telegram/handlers/forecastHandler');
const recommendationHandler = require('./src/interfaces/telegram/handlers/recommendationHandler');
const aiHandler = require('./src/interfaces/telegram/handlers/aiHandler');
const subscriptionHandler = require('./src/interfaces/telegram/handlers/subscriptionHandler');
// ✅ FIXED: Destructure imports for handlers that export objects
const { customerHandler } = require('./src/interfaces/telegram/handlers/customerHandler');
const { supplierHandler } = require('./src/interfaces/telegram/handlers/supplierHandler');
const { projectHandler } = require('./src/interfaces/telegram/handlers/projectHandler');

// =============================================
// REPORT SERVICE IMPORTS
// =============================================
const ReportService = require('./src/application/services/reportService');
const SaleRepository = require('./src/infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('./src/infrastructure/database/sqlite/repositories/PurchaseRepository');
const CustomerRepository = require('./src/infrastructure/database/sqlite/repositories/CustomerRepository');

const { 
    getMainMenuKeyboard, 
    getInventoryKeyboard, 
    getDebtorKeyboard, 
    getCreditorKeyboard, 
    getPurchaseKeyboard, 
    getReportKeyboard, 
    getIncomeKeyboard, 
    getExpenseKeyboard, 
    getAiKeyboard, 
    getSettingsKeyboard,
    getCustomerKeyboard,
    getSupplierKeyboard,
    getProjectKeyboard 
} = require('./src/interfaces/telegram/keyboards/dashboardKeyboard');

const { INDUSTRIES } = require('./src/config/industries');
const SetupBusinessUseCase = require('./src/application/useCases/onboarding/SetupBusinessUseCase');
const UserRepository = require('./src/infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('./src/infrastructure/database/sqlite/repositories/BusinessRepository');
const IncomeRepository = require('./src/infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('./src/infrastructure/database/sqlite/repositories/ExpenseRepository');
const InventoryRepository = require('./src/infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('./src/infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('./src/infrastructure/database/sqlite/repositories/CreditorRepository');

console.log('=====================================');
console.log('🏢 AI CFO ENTERPRISE');
console.log('🚀 Phase 2 - Complete Business Modules');
console.log('=====================================');

// =============================================
// INITIALIZE REPOSITORIES
// =============================================
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const setupUseCase = new SetupBusinessUseCase(userRepo, businessRepo);
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();

// =============================================
// INITIALIZE REPORT SERVICE
// =============================================
const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const customerRepo = new CustomerRepository();

const reportService = new ReportService({
    saleRepository: saleRepo,
    incomeRepository: incomeRepo,
    expenseRepository: expenseRepo,
    purchaseRepository: purchaseRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    customerRepository: customerRepo,
});

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
botInstance.command('debtors', debtorHandler);
botInstance.command('creditors', creditorHandler);
botInstance.command('purchase', purchaseHandler);

// =============================================
// REPORT COMMANDS (Pass reportService)
// =============================================
botInstance.command('reports', (ctx) => reportHandler(ctx, reportService));
botInstance.command('daily', (ctx) => reportHandler(ctx, reportService));
botInstance.command('weekly', (ctx) => reportHandler(ctx, reportService));
botInstance.command('monthly', (ctx) => reportHandler(ctx, reportService));
botInstance.command('yearly', (ctx) => reportHandler(ctx, reportService));
botInstance.command('executive', (ctx) => reportHandler(ctx, reportService));

// =============================================
// OTHER COMMANDS
// =============================================
botInstance.command('forecast', forecastHandler);
botInstance.command('recommendations', recommendationHandler);
botInstance.command('ai', aiHandler);
botInstance.command('subscription', subscriptionHandler);
botInstance.command('customers', customerHandler);
botInstance.command('suppliers', supplierHandler);
botInstance.command('projects', projectHandler);

// =============================================
// TEXT HANDLER
// =============================================
botInstance.on('text', async (ctx) => {
    const telegramId = ctx.from.id;
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(telegramId);
    const text = ctx.message ? ctx.message.text : '';

    if (text.startsWith('/')) return;

    if (session && (session.state === 'LOGIN_WAITING_IDENTIFIER' || session.state === 'LOGIN_WAITING_PASSWORD')) {
        await loginHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('WAITING_FOR_')) {
        await onboardingHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('SALE_WAITING_')) {
        await saleHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('INVENTORY_WAITING_')) {
        await inventoryHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('DEBTOR_WAITING_')) {
        await debtorHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('CREDITOR_WAITING_')) {
        await creditorHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('INCOME_WAITING_')) {
        await incomeHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('EXPENSE_WAITING_')) {
        await expenseHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('PURCHASE_WAITING_')) {
        await purchaseHandler(ctx);
        return;
    }

    // =============================================
    // NEW HANDLERS
    // =============================================
    if (session && session.state && session.state.startsWith('CUSTOMER_')) {
        await customerHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('SUPPLIER_')) {
        await supplierHandler(ctx);
        return;
    }

    if (session && session.state && session.state.startsWith('PROJECT_')) {
        await projectHandler(ctx);
        return;
    }

    if (session && session.state === 'AI_WAITING_QUESTION') {
        await aiHandler(ctx);
        return;
    }

    await ctx.reply('Type /help for available commands.');
});

// =============================================
// CALLBACK QUERY HANDLER
// =============================================
botInstance.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const telegramId = ctx.from.id;
        const sessionManager = getSessionManager();
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);
        const businesses = user ? await businessRepo.findByUserId(user.id) : [];
        const business = businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';

        await ctx.answerCbQuery();

        // =============================================
        // BACK TO MAIN MENU
        // =============================================
        if (data === 'menu_back') {
            await ctx.editMessageText(
                `📊 **Main Menu**\n\nSelect an option below:`,
                { parse_mode: 'Markdown', ...getMainMenuKeyboard(industry) }
            );
            return;
        }

        // =============================================
        // MAIN MENU NAVIGATION
        // =============================================
        if (data === 'menu_dashboard') {
            await dashboardHandler(ctx);
            return;
        }

        if (data === 'menu_reports') {
            await ctx.editMessageText(
                `📋 **Reports**\n\nSelect a report type:`,
                { parse_mode: 'Markdown', ...getReportKeyboard() }
            );
            return;
        }

        // =============================================
        // REPORT CALLBACKS (Pass reportService)
        // =============================================
        if (data === 'report_daily' || data === 'report_weekly' || 
            data === 'report_monthly' || data === 'report_yearly' || 
            data === 'report_executive') {
            await reportCallbackHandler(ctx, reportService);
            return;
        }

        if (data === 'menu_ai') {
            await aiHandler(ctx);
            return;
        }

        if (data === 'menu_settings') {
            await ctx.editMessageText(
                `⚙️ **Settings**\n\nManage your account and preferences:`,
                { parse_mode: 'Markdown', ...getSettingsKeyboard() }
            );
            return;
        }

        if (data === 'menu_sale') {
            await saleHandler(ctx);
            return;
        }

        if (data === 'menu_income') {
            await ctx.editMessageText(
                `💰 **Income Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getIncomeKeyboard() }
            );
            return;
        }

        if (data === 'menu_expense') {
            await ctx.editMessageText(
                `📉 **Expense Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getExpenseKeyboard() }
            );
            return;
        }

        if (data === 'menu_inventory') {
            await inventoryHandler(ctx);
            return;
        }

        if (data === 'menu_debtors') {
            await ctx.editMessageText(
                `👥 **Debtors Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getDebtorKeyboard() }
            );
            return;
        }

        if (data === 'menu_creditors') {
            await ctx.editMessageText(
                `🏦 **Creditors Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getCreditorKeyboard() }
            );
            return;
        }

        if (data === 'menu_purchase') {
            await ctx.editMessageText(
                `🛒 **Purchase Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getPurchaseKeyboard() }
            );
            return;
        }

        // =============================================
        // NEW MENU NAVIGATION
        // =============================================
        if (data === 'menu_forecast') {
            await forecastHandler(ctx);
            return;
        }

        if (data === 'menu_recommendations') {
            await recommendationHandler(ctx);
            return;
        }

        if (data === 'menu_subscription') {
            await subscriptionHandler(ctx);
            return;
        }

        if (data === 'menu_customers') {
            await customerHandler(ctx);
            return;
        }

        if (data === 'menu_suppliers') {
            await supplierHandler(ctx);
            return;
        }

        if (data === 'menu_projects') {
            await projectHandler(ctx);
            return;
        }

        // =============================================
        // INVENTORY ACTIONS
        // =============================================
        if (data === 'inventory_add') {
            sessionManager.createSession(telegramId, 'INVENTORY_WAITING_ITEM', {});
            await ctx.editMessageText(
                `📦 **Add New Stock**\n\nEnter the **item name**:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        if (data === 'inventory_edit') {
            sessionManager.createSession(telegramId, 'INVENTORY_WAITING_EDIT_ITEM', {});
            await ctx.editMessageText(
                `✏️ **Edit Inventory Item**\n\nEnter the **item name** or **ID** to edit:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        if (data === 'inventory_adjust') {
            sessionManager.createSession(telegramId, 'INVENTORY_WAITING_ADJUST_QUANTITY', {});
            await ctx.editMessageText(
                `📦 **Adjust Stock**\n\nEnter the **item name** or **ID** to adjust:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        if (data === 'inventory_list') {
            await listInventory(ctx);
            return;
        }
        if (data === 'inventory_low') {
            await lowStockAlert(ctx);
            return;
        }
        if (data === 'inventory_value') {
            await inventoryValue(ctx);
            return;
        }
        // ✅ NEW: Inventory Delete
        if (data === 'inventory_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'INVENTORY_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Inventory Item**\n\nEnter the item ID to delete:`
            );
            return;
        }

        // =============================================
        // DEBTOR ACTIONS (UPDATED with Total Owed & Delete)
        // =============================================
        if (data === 'debtor_add') {
            sessionManager.createSession(telegramId, 'DEBTOR_WAITING_NAME', {});
            await ctx.editMessageText(
                `👤 **Add New Debtor**\n\nEnter the customer name:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        if (data === 'debtor_pay') {
            if (!user) {
                await ctx.reply('⚠️ Please register first.');
                return;
            }
            const debtors = await debtorRepo.findActive(user.id);
            if (debtors.length === 0) {
                await ctx.reply('✅ No active debtors to receive payments from.');
                await ctx.reply(`Select an option below:`, { ...getDebtorKeyboard() });
                return;
            }
            let message = `💰 **Record Payment**\n\nSelect a debtor by ID:\n\n`;
            for (const debtor of debtors) {
                message += `🆔 ${debtor.id}: ${debtor.customer_name} - ₦${debtor.balance_remaining.toLocaleString()}\n`;
            }
            message += `\nEnter the debtor ID to proceed.`;
            sessionManager.createSession(telegramId, 'DEBTOR_WAITING_PAYMENT_AMOUNT', { debtors: debtors });
            await ctx.editMessageText(message, { parse_mode: 'Markdown' });
            return;
        }
        if (data === 'debtor_list') {
            await listDebtors(ctx);
            return;
        }
        if (data === 'debtor_total') {
            await debtorHandler(ctx);
            return;
        }
        if (data === 'debtor_overdue') {
            await overdueDebtors(ctx);
            return;
        }
        // ✅ NEW: Debtor Delete
        if (data === 'debtor_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'DEBTOR_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Debtor**\n\nEnter the debtor ID to delete:`
            );
            return;
        }

        // =============================================
        // CREDITOR ACTIONS (UPDATED with Total Owed & Delete)
        // =============================================
        if (data === 'creditor_add') {
            sessionManager.createSession(telegramId, 'CREDITOR_WAITING_NAME', {});
            await ctx.editMessageText(
                `🏢 **Add New Creditor**\n\nEnter the supplier name:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        if (data === 'creditor_pay') {
            if (!user) {
                await ctx.reply('⚠️ Please register first.');
                return;
            }
            const allCreditors = await creditorRepo.findByUserId(user.id);
            const activeCreditors = allCreditors.filter(c => c.balance_remaining > 0 && c.status !== 'PAID');
            if (activeCreditors.length === 0) {
                await ctx.reply('✅ No active creditors to make payments to.');
                await ctx.reply(`Select an option below:`, { ...getCreditorKeyboard() });
                return;
            }
            let message = `💰 **Record Payment to Creditor**\n\nSelect a creditor by ID:\n\n`;
            for (const creditor of activeCreditors) {
                message += `🆔 ${creditor.id}: ${creditor.supplier_name} - ₦${creditor.balance_remaining.toLocaleString()}\n`;
            }
            message += `\nEnter the creditor ID to proceed.`;
            sessionManager.createSession(telegramId, 'CREDITOR_WAITING_PAYMENT_AMOUNT', { creditors: activeCreditors });
            await ctx.editMessageText(message, { parse_mode: 'Markdown' });
            return;
        }
        if (data === 'creditor_list') {
            await listCreditors(ctx);
            return;
        }
        if (data === 'creditor_total') {
            await creditorHandler(ctx);
            return;
        }
        if (data === 'creditor_overdue') {
            await overdueCreditors(ctx);
            return;
        }
        // ✅ NEW: Creditor Delete
        if (data === 'creditor_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'CREDITOR_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Creditor**\n\nEnter the creditor ID to delete:`
            );
            return;
        }

        // =============================================
        // PURCHASE ACTIONS (UPDATED with Delete)
        // =============================================
        if (data === 'purchase_add') {
            await startPurchaseFlow(ctx, telegramId);
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
        // ✅ NEW: Purchase Delete
        if (data === 'purchase_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'PURCHASE_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Purchase**\n\nEnter the purchase ID to delete:`
            );
            return;
        }

        // =============================================
        // INCOME ACTIONS
        // =============================================
        if (data === 'income_add') {
            await startIncomeFlow(ctx, telegramId);
            return;
        }
        if (data === 'income_list') {
            await listIncome(ctx);
            return;
        }
        if (data === 'income_summary') {
            await incomeSummary(ctx);
            return;
        }
        if (data === 'income_today') {
            await incomeToday(ctx);
            return;
        }

        // =============================================
        // EXPENSE ACTIONS
        // =============================================
        if (data === 'expense_add') {
            await startExpenseFlow(ctx, telegramId);
            return;
        }
        if (data === 'expense_list') {
            await listExpenses(ctx);
            return;
        }
        if (data === 'expense_summary') {
            await expenseSummary(ctx);
            return;
        }
        if (data === 'expense_today') {
            await expenseToday(ctx);
            return;
        }

        // =============================================
        // FORECAST ACTIONS
        // =============================================
        if (data === 'forecast_3' || data === 'forecast_6' || data === 'forecast_12' || data === 'forecast_seasonality' || data === 'forecast_again') {
            await forecastHandler(ctx);
            return;
        }

        // =============================================
        // RECOMMENDATION ACTIONS
        // =============================================
        if (data === 'refresh_recommendations') {
            await recommendationHandler(ctx);
            return;
        }

        // =============================================
        // AI ACTIONS
        // =============================================
        if (data === 'ai_ask' || data === 'ai_ask_question' || data === 'ai_advice' || data === 'ai_advice_revenue' || data === 'ai_advice_costs' || data === 'ai_menu') {
            await aiHandler(ctx);
            return;
        }

        // =============================================
        // SUBSCRIPTION ACTIONS
        // =============================================
        if (data === 'subscription_upgrade' || data === 'subscription_features' || data === 'subscription_cancel' || data === 'back_subscription' || data === 'upgrade_pro' || data === 'upgrade_business' || data === 'cancel_confirm') {
            await subscriptionHandler(ctx);
            return;
        }

        // =============================================
        // CUSTOMER ACTIONS (UPDATED with Delete)
        // =============================================
        if (data === 'customer_create' || data === 'customer_view' || data === 'customer_list' || data === 'customer_history' || data === 'customer_back') {
            await customerHandler(ctx);
            return;
        }
        if (data && data.startsWith('customer_history_')) {
            await customerHandler(ctx);
            return;
        }
        // ✅ NEW: Customer Delete
        if (data === 'customer_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'CUSTOMER_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Customer**\n\nEnter the customer ID to delete:`
            );
            return;
        }

        // =============================================
        // SUPPLIER ACTIONS (UPDATED with Delete)
        // =============================================
        if (data === 'supplier_create' || data === 'supplier_view' || data === 'supplier_list' || data === 'supplier_back') {
            await supplierHandler(ctx);
            return;
        }
        // ✅ NEW: Supplier Delete
        if (data === 'supplier_delete') {
            sessionManager.clearSession(telegramId);
            sessionManager.setState(telegramId, 'SUPPLIER_WAITING_DELETE_ID');
            await ctx.editMessageText(
                `🗑️ **Delete Supplier**\n\nEnter the supplier ID to delete:`
            );
            return;
        }

        // =============================================
        // PROJECT ACTIONS
        // =============================================
        if (data === 'project_create' || data === 'project_view' || data === 'project_list' || data === 'project_financials' || data === 'project_back') {
            await projectHandler(ctx);
            return;
        }
        if (data && data.startsWith('project_financials_')) {
            await projectHandler(ctx);
            return;
        }

        // =============================================
        // BACK TO MAIN
        // =============================================
        if (data === 'back_main') {
            await ctx.editMessageText(
                `📊 **Main Menu**\n\nSelect an option below:`,
                { parse_mode: 'Markdown', ...getMainMenuKeyboard(industry) }
            );
            return;
        }

        // =============================================
        // ASK AI ACTIONS (Legacy)
        // =============================================
        if (data === 'ai_summary') {
            await ctx.reply('📊 **AI Summary**\n\nComing soon in Phase 3!');
            return;
        }

        // =============================================
        // INDUSTRY SELECTION (Onboarding)
        // =============================================
        if (data && data.startsWith('industry_')) {
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

                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);
                const formattedEndDate = trialEndDate.toLocaleDateString('en-NG', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });

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
                    `Select an option below to get started:`;

                await ctx.editMessageText(message, { 
                    parse_mode: 'Markdown',
                    ...getMainMenuKeyboard(industryId)
                });

            } catch (error) {
                console.error('Registration error:', error);
                await ctx.reply(`❌ Registration failed: ${error.message}`);
            }
            return;
        }

        // If no callback matched
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
    console.log('📊 Professional dashboard with sub-menus loaded');
    console.log('🛒 Purchase module integrated with Inventory & Creditors');
    console.log('✏️ Inventory Edit & Adjust Stock features added');
    console.log('📈 Forecast module loaded');
    console.log('💡 Recommendations module loaded');
    console.log('🧠 AI Assistant loaded');
    console.log('📋 Subscription module loaded');
    console.log('👤 Customer module loaded');
    console.log('🏢 Supplier module loaded');
    console.log('🏗️ Project module loaded');
    console.log('🗑️ Delete functionality added to all modules');
    console.log('📊 Report Service loaded (Daily/Weekly/Monthly/Yearly/Executive)');
    console.log('=====================================');
}).catch((error) => {
    console.error('❌ Failed to launch bot:', error);
    process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));