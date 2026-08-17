// src/interfaces/telegram/handlers/reportHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const GetExecutiveSummaryUseCase = require('../../../application/useCases/reports/GetExecutiveSummaryUseCase');
const ExportService = require('../../../infrastructure/services/export/ExportService');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const saleRepo = new SaleRepository();
const incomeRepo = new IncomeRepository();
const expenseRepo = new ExpenseRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const exportService = new ExportService();
const executiveSummaryUseCase = new GetExecutiveSummaryUseCase(
    saleRepo, incomeRepo, expenseRepo, debtorRepo, creditorRepo, inventoryRepo
);

async function reportHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const businesses = await businessRepo.findByUserId(user.id);
        const business = businesses.length > 0 ? businesses[0] : null;
        if (!business) {
            await ctx.reply('⚠️ No business found.');
            return;
        }

        const industry = INDUSTRIES[business.industry];
        const industryName = industry ? `${industry.icon} ${industry.name}` : business.industry;

        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Get the report type from the callback data (or default to daily)
        const reportType = ctx.callbackQuery?.data || 'report_daily';

        let message = `📋 **${business.name} - `;

        if (reportType === 'report_daily' || reportType === 'report_weekly' || reportType === 'report_monthly') {
            // Existing report logic (Daily, Weekly, Monthly)
            const dailySales = await saleRepo.getDailyReport(user.id, today);
            const weeklySales = await saleRepo.getWeeklyReport(user.id, weekAgo, today);
            const monthlySales = await saleRepo.getDailyReport(user.id, monthAgo);
            const totalIncome = await incomeRepo.getIncomeSummary(user.id);
            const totalExpenses = await expenseRepo.getExpenseSummary(user.id);

            message += `Financial Report**\n🏭 ${industryName}\n📅 ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 **Today's Summary**\n📝 ${dailySales.total_transactions || 0} sales\n💰 ₦${(dailySales.total_revenue || 0).toLocaleString()}\n📦 ${dailySales.total_items || 0} items sold\n\n📈 **Weekly Sales Trend**\n`;

            if (weeklySales && weeklySales.length > 0) {
                let weekTotal = 0;
                for (const day of weeklySales) {
                    weekTotal += day.revenue || 0;
                    const dayDate = new Date(day.day);
                    const dayName = dayDate.toLocaleDateString('en-NG', { weekday: 'short' });
                    message += `   ${dayName}: ₦${(day.revenue || 0).toLocaleString()} (${day.transactions || 0})\n`;
                }
                message += `   ─────────────────────\n   **Week Total: ₦${weekTotal.toLocaleString()}**\n\n`;
            } else {
                message += `   No sales in the last 7 days.\n\n`;
            }

            message += `📊 **Month-to-Date**\n📝 ${monthlySales.total_transactions || 0} sales\n💰 ₦${(monthlySales.total_revenue || 0).toLocaleString()}\n📦 ${monthlySales.total_items || 0} items sold\n💵 Income: ₦${(totalIncome?.total_amount || 0).toLocaleString()}\n📉 Expenses: ₦${(totalExpenses?.total_amount || 0).toLocaleString()}\n📈 **Net Profit: ₦${((monthlySales.total_revenue || 0) + (totalIncome?.total_amount || 0) - (totalExpenses?.total_amount || 0)).toLocaleString()}**`;

            await ctx.reply(message);
            return;
        }

        if (reportType === 'report_executive') {
            // Executive Summary
            const result = await executiveSummaryUseCase.execute(user.id);
            const s = result.summary;

            message = `Executive Summary**\n🏭 ${industryName}\n📅 ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 **Key Metrics**\n💰 Revenue: ₦${s.totalRevenue.toLocaleString()}\n📉 Expenses: ₦${s.totalExpenses.toLocaleString()}\n📈 **Net Profit: ₦${s.netProfit.toLocaleString()}**\n📦 Total Sales: ${s.totalSales}\n📦 Items Sold: ${s.totalItemsSold}\n👥 Active Debtors: ${s.activeDebtors}\n🏦 Active Creditors: ${s.activeCreditors}\n📦 Inventory Items: ${s.inventoryItems}\n💰 Inventory Value: ₦${s.inventoryValue.toLocaleString()}\n\n📋 **Recent Sales**\n`;

            if (result.sales.length > 0) {
                for (const sale of result.sales.slice(0, 5)) {
                    message += `📌 ${sale.item_name} - ₦${sale.total_price.toLocaleString()} (${sale.customer_name || 'N/A'})\n`;
                }
            } else {
                message += `No sales recorded yet.\n`;
            }

            await ctx.reply(message);
            return;
        }

        if (reportType === 'report_pdf' || reportType === 'report_excel') {
            // Generate the summary data first
            const result = await executiveSummaryUseCase.execute(user.id);
            const data = {
                businessName: business.name,
                summary: result.summary,
                sales: result.sales,
            };

            let buffer;
            let filename;
            let contentType;

            if (reportType === 'report_pdf') {
                buffer = await exportService.generatePDF(data, 'Executive Summary');
                filename = `Executive_Summary_${business.name.replace(/\s/g, '_')}.pdf`;
                contentType = 'application/pdf';
            } else {
                buffer = await exportService.generateExcel(data, 'Executive Summary');
                filename = `Executive_Summary_${business.name.replace(/\s/g, '_')}.xlsx`;
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            // Send the file
            await ctx.replyWithDocument({ source: buffer, filename }, {
                caption: `📄 Here is your ${reportType === 'report_pdf' ? 'PDF' : 'Excel'} report for ${business.name}.`,
            });
            return;
        }

        // Fallback
        await ctx.reply('Select a report type from the menu.');

    } catch (error) {
        logger.error('Report handler error:', error);
        await ctx.reply('❌ Failed to generate report. Please try again.');
    }
}

module.exports = reportHandler;