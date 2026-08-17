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
const { getMainMenuKeyboard, getInventoryKeyboard, getDebtorKeyboard, getCreditorKeyboard, getReportKeyboard, getIncomeKeyboard, getExpenseKeyboard, getAiKeyboard, getSettingsKeyboard } = require('./src/interfaces/telegram/keyboards/dashboardKeyboard');
const { INDUSTRIES } = require('./src/config/industries');
const SetupBusinessUseCase = require('./src/application/useCases/onboarding/SetupBusinessUseCase');
const UserRepository = require('./src/infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('./src/infrastructure/database/sqlite/repositories/BusinessRepository');
const IncomeRepository = require('./src/infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('./src/infrastructure/database/sqlite/repositories/ExpenseRepository');
const InventoryRepository = require('./src/infrastructure/database/sqlite/repositories/InventoryRepository');

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
botInstance.command('reports', reportHandler);

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

        if (data === 'menu_ai') {
            await ctx.editMessageText(
                `🤖 **Ask AI**\n\nGet financial insights and advice:`,
                { parse_mode: 'Markdown', ...getAiKeyboard() }
            );
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
            await ctx.editMessageText(
                `📦 **Inventory Management**\n\nSelect an option:`,
                { parse_mode: 'Markdown', ...getInventoryKeyboard() }
            );
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

        // =============================================
        // INVENTORY ACTIONS
        // =============================================
        if (data === 'inventory_add') {
            await inventoryHandler(ctx);
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
            const items = await inventoryRepo.findByUserId(user.id);
            const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.selling_price || 0)), 0);
            await ctx.reply(`💰 **Total Inventory Value**\n\n₦${totalValue.toLocaleString()}`);
            return;
        }

        // =============================================
        // DEBTOR ACTIONS
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
            await debtorHandler(ctx);
            return;
        }
        if (data === 'debtor_list') {
            await listDebtors(ctx);
            return;
        }
        if (data === 'debtor_overdue') {
            await overdueDebtors(ctx);
            return;
        }

        // =============================================
        // CREDITOR ACTIONS
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
            await creditorHandler(ctx);
            return;
        }
        if (data === 'creditor_list') {
            await listCreditors(ctx);
            return;
        }
        if (data === 'creditor_overdue') {
            await overdueCreditors(ctx);
            return;
        }

        // =============================================
        // INCOME ACTIONS
        // =============================================
        if (data === 'income_add') {
            await incomeHandler(ctx);
            return;
        }
        if (data === 'income_list') {
            const incomes = await incomeRepo.findByUserId(user.id);
            if (incomes.length === 0) {
                await ctx.reply('📋 **No income records found.**');
                return;
            }
            let message = `💰 **All Income Records**\n\n`;
            for (const inc of incomes.slice(0, 15)) {
                message += `📌 ${inc.source}\n`;
                message += `   💰 ₦${inc.amount.toLocaleString()}\n`;
                message += `   📂 ${inc.category || 'Other'}\n`;
                message += `   📅 ${new Date(inc.created_at).toLocaleDateString()}\n\n`;
            }
            if (incomes.length > 15) {
                message += `... and ${incomes.length - 15} more.`;
            }
            await ctx.reply(message);
            return;
        }
        if (data === 'income_summary') {
            const summary = await incomeRepo.getIncomeSummary(user.id);
            await ctx.reply(
                `📊 **Income Summary**\n\n` +
                `📝 Total Entries: ${summary.total_entries || 0}\n` +
                `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
                `📊 Average: ₦${(summary.average_amount || 0).toLocaleString()}\n` +
                `📂 Categories: ${summary.categories_used || 0}`
            );
            return;
        }
        if (data === 'income_today') {
            const todayIncome = await incomeRepo.getTodayIncome(user.id);
            if (todayIncome.length === 0) {
                await ctx.reply('📅 **No income recorded today.**');
                return;
            }
            let message = `📅 **Today's Income**\n\n`;
            for (const inc of todayIncome) {
                message += `📌 ${inc.source}\n`;
                message += `   💰 ₦${inc.amount.toLocaleString()}\n`;
            }
            await ctx.reply(message);
            return;
        }

        // =============================================
        // EXPENSE ACTIONS
        // =============================================
        if (data === 'expense_add') {
            await expenseHandler(ctx);
            return;
        }
        if (data === 'expense_list') {
            const expenses = await expenseRepo.findByUserId(user.id);
            if (expenses.length === 0) {
                await ctx.reply('📋 **No expense records found.**');
                return;
            }
            let message = `📉 **All Expense Records**\n\n`;
            for (const exp of expenses.slice(0, 15)) {
                message += `📌 ${exp.category}\n`;
                message += `   💰 ₦${exp.amount.toLocaleString()}\n`;
                message += `   📝 ${exp.description || 'No description'}\n`;
                message += `   📅 ${new Date(exp.created_at).toLocaleDateString()}\n\n`;
            }
            if (expenses.length > 15) {
                message += `... and ${expenses.length - 15} more.`;
            }
            await ctx.reply(message);
            return;
        }
        if (data === 'expense_summary') {
            const summary = await expenseRepo.getExpenseSummary(user.id);
            await ctx.reply(
                `📊 **Expense Summary**\n\n` +
                `📝 Total Entries: ${summary.total_entries || 0}\n` +
                `💰 Total Amount: ₦${(summary.total_amount || 0).toLocaleString()}\n` +
                `📊 Average: ₦${(summary.average_amount || 0).toLocaleString()}\n` +
                `📂 Categories: ${summary.categories_used || 0}`
            );
            return;
        }
        if (data === 'expense_today') {
            const todayExpenses = await expenseRepo.getTodayExpenses(user.id);
            if (todayExpenses.length === 0) {
                await ctx.reply('📅 **No expenses recorded today.**');
                return;
            }
            let message = `📅 **Today's Expenses**\n\n`;
            for (const exp of todayExpenses) {
                message += `📌 ${exp.category}\n`;
                message += `   💰 ₦${exp.amount.toLocaleString()}\n`;
            }
            await ctx.reply(message);
            return;
        }

        // =============================================
        // REPORT ACTIONS
        // =============================================
        if (data === 'report_daily' || data === 'report_weekly' || data === 'report_monthly') {
            await reportHandler(ctx);
            return;
        }
        if (data === 'report_executive') {
            await ctx.reply('📋 **Executive Summary**\n\nComing soon in Phase 3!');
            return;
        }

        // =============================================
        // ASK AI ACTIONS
        // =============================================
        if (data === 'ai_ask') {
            await ctx.reply('🤖 **Ask AI**\n\nType your financial question below:');
            return;
        }
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
    console.log('=====================================');
}).catch((error) => {
    console.error('❌ Failed to launch bot:', error);
    process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));