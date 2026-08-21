// src/interfaces/telegram/handlers/aiHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();

async function aiHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;

        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        // Handle callback queries
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            await ctx.answerCbQuery();

            if (data === 'ai_ask_question') {
                sessionManager.setState(telegramId, 'AI_WAITING_QUESTION');
                await ctx.reply(
                    '❓ **Ask Your Question**\n\n' +
                    'Type any question about your business finances.\n\n' +
                    'Examples:\n' +
                    '• "What is my most profitable product?"\n' +
                    '• "How can I reduce my expenses?"\n' +
                    '• "Who owes me the most money?"\n' +
                    '• "What\'s my profit margin?"\n' +
                    '• "When should I restock inventory?"'
                );
                return;
            }

            if (data === 'ai_advice') {
                await generateAdvice(ctx, business.id, user.id, 'general');
                return;
            }

            if (data === 'ai_advice_revenue') {
                await generateAdvice(ctx, business.id, user.id, 'revenue');
                return;
            }

            if (data === 'ai_advice_costs') {
                await generateAdvice(ctx, business.id, user.id, 'costs');
                return;
            }

            if (data === 'ai_menu') {
                await showAIMenu(ctx);
                return;
            }

            if (data === 'back_main') {
                const { startHandler } = require('./startHandler');
                await startHandler(ctx);
                return;
            }

            // If callback doesn't match, show menu
            await showAIMenu(ctx);
            return;
        }

        // Handle text input - check if in AI_WAITING_QUESTION state
        const state = session ? session.state : null;

        if (state === 'AI_WAITING_QUESTION') {
            await handleQuestion(ctx, business.id, user.id);
            return;
        }

        // Default: show AI menu
        await showAIMenu(ctx);

    } catch (error) {
        logger.error('AI handler error:', error);
        console.error('AI handler error details:', error.message, error.stack);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showAIMenu(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'AI_MENU');

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '❓ Ask a Question', callback_data: 'ai_ask_question' }],
                [{ text: '💡 Get Financial Advice', callback_data: 'ai_advice' }],
                [{ text: '📊 Revenue Advice', callback_data: 'ai_advice_revenue' }],
                [{ text: '💰 Cost Reduction Advice', callback_data: 'ai_advice_costs' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
            ],
        },
    };

    await ctx.reply(
        `🧠 **AI Financial Assistant**

Ask me anything about your business finances, and I'll provide insights based on your actual data.

**What can I help you with?**

• ❓ **Ask a Question** — Any financial question
• 💡 **General Advice** — Overall business health
• 📊 **Revenue Advice** — Ways to increase income
• 💰 **Cost Reduction** — Save money on expenses

Type your question or select an option above.`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handleQuestion(ctx, businessId, userId) {
    const question = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!question) {
        await ctx.reply('Please type your question.');
        return;
    }

    try {
        await ctx.reply('🤔 Thinking...');

        // Fetch business data for context
        const [sales, incomes, expenses, purchases, debtors, creditors, inventory] = await Promise.all([
            saleRepo.findByUserId(userId),
            incomeRepo.findByUserId(userId),
            expenseRepo.findByUserId(userId),
            purchaseRepo.findByUserId(userId),
            debtorRepo.findActive(userId),
            creditorRepo.findActive(userId),
            inventoryRepo.findByUserId(userId),
        ]);

        const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);
        const totalDebtors = debtors.reduce((sum, d) => sum + (d.balance_remaining || 0), 0);
        const totalCreditors = creditors.reduce((sum, c) => sum + (c.balance_remaining || 0), 0);
        const totalRevenue = totalSales + totalIncome;
        const totalCosts = totalExpenses + totalPurchases;
        const netProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Generate response based on question keywords
        let response = '';
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('profit') || lowerQuestion.includes('margin')) {
            response = `📊 **Profit Analysis**

Your current financial metrics:

• Total Revenue: ₦${totalRevenue.toLocaleString()}
• Total Costs: ₦${totalCosts.toLocaleString()}
• Net Profit: ₦${netProfit.toLocaleString()}
• Profit Margin: ${profitMargin.toFixed(1)}%

${profitMargin > 20 ? '✅ Your profit margin is healthy!' : profitMargin > 10 ? '⚠️ Your profit margin is moderate. Consider optimizing costs.' : '⚠️ Your profit margin is low. Review your pricing and costs.'}`;
        } else if (lowerQuestion.includes('debtor') || lowerQuestion.includes('owe') || lowerQuestion.includes('outstanding')) {
            const overdueDebtors = debtors.filter(d => d.status === 'OVERDUE');
            response = `👥 **Debtor Analysis**

• Total Outstanding: ₦${totalDebtors.toLocaleString()}
• Active Debtors: ${debtors.length}
• Overdue Debtors: ${overdueDebtors.length}

${overdueDebtors.length > 0 ? `⚠️ ${overdueDebtors.length} debtor(s) are overdue. Follow up immediately.` : '✅ All debtors are current.'}`;
        } else if (lowerQuestion.includes('creditor') || lowerQuestion.includes('supplier') || lowerQuestion.includes('pay')) {
            const overdueCreditors = creditors.filter(c => c.status === 'OVERDUE');
            response = `🏦 **Creditor Analysis**

• Total Owed: ₦${totalCreditors.toLocaleString()}
• Active Creditors: ${creditors.length}
• Overdue Creditors: ${overdueCreditors.length}

${overdueCreditors.length > 0 ? `⚠️ ${overdueCreditors.length} creditor(s) are overdue. Make payments to maintain relationships.` : '✅ All creditors are current.'}`;
        } else if (lowerQuestion.includes('inventory') || lowerQuestion.includes('stock')) {
            const lowStock = inventory.filter(item => item.quantity <= (item.reorder_level || 5));
            const totalValue = inventory.reduce((sum, i) => sum + (i.cost_price * i.quantity), 0);
            response = `📦 **Inventory Analysis**

• Total Items: ${inventory.length}
• Total Value: ₦${totalValue.toLocaleString()}
• Low Stock Items: ${lowStock.length}

${lowStock.length > 0 ? `⚠️ ${lowStock.length} item(s) need restocking: ${lowStock.map(i => i.item_name).join(', ')}` : '✅ Stock levels are healthy.'}`;
        } else if (lowerQuestion.includes('revenue') || lowerQuestion.includes('income') || lowerQuestion.includes('sales')) {
            // Find top product
            const productSales = {};
            sales.forEach(sale => {
                const name = sale.item_name || 'Unknown';
                if (!productSales[name]) productSales[name] = 0;
                productSales[name] += sale.total_price || 0;
            });
            const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
            response = `💰 **Revenue Analysis**

• Total Sales: ₦${totalSales.toLocaleString()}
• Other Income: ₦${totalIncome.toLocaleString()}
• Total Revenue: ₦${totalRevenue.toLocaleString()}
• Total Transactions: ${sales.length}

${topProduct ? `🏆 Top Product: ${topProduct[0]} (₦${topProduct[1].toLocaleString()})` : ''}`;
        } else if (lowerQuestion.includes('expense') || lowerQuestion.includes('cost') || lowerQuestion.includes('spend')) {
            response = `📉 **Expense Analysis**

• Total Expenses: ₦${totalExpenses.toLocaleString()}
• Total Purchases: ₦${totalPurchases.toLocaleString()}
• Total Costs: ₦${totalCosts.toLocaleString()}

${totalCosts > totalRevenue ? '⚠️ Your costs exceed revenue. Review expenses immediately.' : '✅ Costs are under control.'}`;
        } else {
            // General response
            response = `📊 **Business Overview**

Here's a snapshot of your business:

• Revenue: ₦${totalRevenue.toLocaleString()}
• Costs: ₦${totalCosts.toLocaleString()}
• Profit: ₦${netProfit.toLocaleString()}
• Margin: ${profitMargin.toFixed(1)}%
• Debtors: ₦${totalDebtors.toLocaleString()}
• Creditors: ₦${totalCreditors.toLocaleString()}
• Inventory Items: ${inventory.length}

What specific area would you like to explore further?`;
        }

        // Add disclaimer
        response += `\n\n---\n_This is an automated analysis based on your data._`;

        await ctx.reply(response);

        // Keep session in question mode
        sessionManager.setState(telegramId, 'AI_WAITING_QUESTION');

        await ctx.reply('Ask another question or select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❓ Ask Another Question', callback_data: 'ai_ask_question' }],
                    [{ text: '🔙 Back to AI Menu', callback_data: 'ai_menu' }],
                ],
            },
        });

    } catch (error) {
        logger.error('AI question error:', error);
        console.error('AI question error details:', error.message, error.stack);
        await ctx.reply(`❌ Failed to process question: ${error.message}`);
    }
}

async function generateAdvice(ctx, businessId, userId, topic) {
    try {
        await ctx.reply('🧠 Analyzing your business data...');

        // Fetch data
        const [sales, incomes, expenses, purchases, debtors, creditors, inventory] = await Promise.all([
            saleRepo.findByUserId(userId),
            incomeRepo.findByUserId(userId),
            expenseRepo.findByUserId(userId),
            purchaseRepo.findByUserId(userId),
            debtorRepo.findActive(userId),
            creditorRepo.findActive(userId),
            inventoryRepo.findByUserId(userId),
        ]);

        const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);
        const totalDebtors = debtors.reduce((sum, d) => sum + (d.balance_remaining || 0), 0);
        const totalCreditors = creditors.reduce((sum, c) => sum + (c.balance_remaining || 0), 0);
        const totalRevenue = totalSales + totalIncome;
        const totalCosts = totalExpenses + totalPurchases;
        const netProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        let message = `💡 **AI Financial Advice**\n\n`;

        if (topic === 'general' || topic === 'general') {
            // Find top product
            const productSales = {};
            sales.forEach(sale => {
                const name = sale.item_name || 'Unknown';
                if (!productSales[name]) productSales[name] = 0;
                productSales[name] += sale.total_price || 0;
            });
            const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];

            message += `📊 **Business Health Assessment**

Based on your data, here's an overview:

• Revenue: ₦${totalRevenue.toLocaleString()}
• Profit: ₦${netProfit.toLocaleString()}
• Margin: ${profitMargin.toFixed(1)}%

**Key Insights:**
${profitMargin > 20 ? '✅ Your business has a healthy profit margin.' : '⚠️ Consider improving your profit margin.'}
${debtors.length > 0 ? `👥 ${debtors.length} active debtors (₦${totalDebtors.toLocaleString()})` : '✅ No outstanding debtors.'}
${inventory.length > 0 ? `📦 ${inventory.length} inventory items` : '⚠️ No inventory items recorded.'}
${totalSales > 0 && topProduct ? `🏆 Top Product: ${topProduct[0]} (₦${topProduct[1].toLocaleString()})` : ''}

**Recommendation:**
${profitMargin < 20 ? '• Review your pricing strategy and reduce costs.' : '• Consider reinvesting profits into growth opportunities.'}
${debtors.length > 0 ? '• Follow up on outstanding debtors.' : ''}`;

        } else if (topic === 'revenue') {
            // Find top product
            const productSales = {};
            sales.forEach(sale => {
                const name = sale.item_name || 'Unknown';
                if (!productSales[name]) productSales[name] = 0;
                productSales[name] += sale.total_price || 0;
            });
            const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
            const lowSellingItems = inventory.filter(item => {
                const itemSales = sales.filter(s => s.item_name === item.item_name);
                return itemSales.length === 0 && item.quantity > 0 && item.selling_price > 0;
            });

            message += `📊 **Revenue Growth Advice**

• Total Revenue: ₦${totalRevenue.toLocaleString()}
• Sales Transactions: ${sales.length}

**Opportunities:**
${topProduct ? `🏆 Top Product: ${topProduct[0]} (₦${topProduct[1].toLocaleString()})` : '⚠️ No sales recorded. Start selling!'}
${lowSellingItems.length > 0 ? `📦 ${lowSellingItems.length} item(s) with no sales: ${lowSellingItems.map(i => i.item_name).join(', ')}` : ''}

**Recommendations:**
• ${totalSales === 0 ? 'Record your first sale using /sale' : `Focus on your top product: ${topProduct ? topProduct[0] : ''}`}
• ${lowSellingItems.length > 0 ? 'Run promotions on slow-moving items.' : 'Consider expanding your product range.'}
• ${debtors.length > 0 ? 'Collect outstanding payments to improve cash flow.' : 'Maintain healthy cash flow by tracking payments.'}`;

        } else if (topic === 'costs') {
            const expenseCategories = {};
            expenses.forEach(expense => {
                const category = expense.category || 'Uncategorized';
                if (!expenseCategories[category]) expenseCategories[category] = 0;
                expenseCategories[category] += expense.amount || 0;
            });
            const sortedCategories = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

            message += `📊 **Cost Reduction Advice**

• Total Expenses: ₦${totalExpenses.toLocaleString()}
• Total Purchases: ₦${totalPurchases.toLocaleString()}
• Total Costs: ₦${totalCosts.toLocaleString()}

**Expense Breakdown:**
${sortedCategories.slice(0, 5).map(([cat, amount]) => `• ${cat}: ₦${amount.toLocaleString()}`).join('\n')}

**Recommendations:**
• ${totalExpenses > 0 ? 'Review your largest expense categories.' : 'Track your expenses using /expense'}
• ${totalPurchases > 0 ? 'Negotiate better prices with suppliers.' : 'Record purchases using /purchase'}
• ${totalCosts > totalRevenue * 0.5 ? '⚠️ Your costs are high relative to revenue. Consider cost-cutting measures.' : '✅ Your costs are well-managed.'}`;
        }

        await ctx.reply(message);

        await ctx.reply('What would you like to do next?', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Get More Advice', callback_data: `ai_advice_${topic}` }],
                    [{ text: '🔙 Back to AI Menu', callback_data: 'ai_menu' }],
                ],
            },
        });

    } catch (error) {
        logger.error('Generate advice error:', error);
        console.error('Generate advice error details:', error.message, error.stack);
        await ctx.reply(`❌ Failed to generate advice: ${error.message}`);
    }
}

module.exports = {
    aiHandler,
    showAIMenu,
    handleQuestion,
};