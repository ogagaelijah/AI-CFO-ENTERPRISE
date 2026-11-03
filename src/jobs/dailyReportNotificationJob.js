// src/jobs/dailyReportNotificationJob.js
// v1.0.0-prod — Runs daily at 07:00 AM (Africa/Lagos).
//               Generates yesterday's daily report and pushes to Owners/Admins.

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const DailyReportService = require('../application/services/reports/DailyReportService');
const UserRepository = require('../infrastructure/database/sqlite/repositories/UserRepository');
const { sendBulkPushNotifications } = require('../infrastructure/services/notifications/ExpoPushService');

// Import repos needed for DailyReportService
const SaleRepository = require('../infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../infrastructure/database/sqlite/repositories/ExpenseRepository');
const IncomeRepository = require('../infrastructure/database/sqlite/repositories/IncomeRepository');
const DebtorRepository = require('../infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../infrastructure/database/sqlite/repositories/CreditorRepository');
const InventoryRepository = require('../infrastructure/database/sqlite/repositories/InventoryRepository');
const PaymentRepository = require('../infrastructure/database/sqlite/repositories/PaymentRepository');

// Initialize repos
const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();
const incomeRepo = new IncomeRepository();
const debtorRepo = new DebtorRepository();
const creditorRepo = new CreditorRepository();
const inventoryRepo = new InventoryRepository();
const paymentRepo = new PaymentRepository();
const userRepo = new UserRepository();

const dailyReportService = new DailyReportService({
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
    incomeRepository: incomeRepo,
    debtorRepository: debtorRepo,
    creditorRepository: creditorRepo,
    inventoryRepository: inventoryRepo,
    paymentRepository: paymentRepo,
});

let isRunning = false;

const formatCurrency = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

async function runDailyReportJob() {
    if (isRunning) {
        logger.warn('⚠️ Daily Report notification job is already running. Skipping.');
        return;
    }

    isRunning = true;
    try {
        logger.info('🕐 [CRON] Running Morning Daily Report job...');

        // 1. Calculate yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ymd = yesterday.toISOString().split('T')[0];

        // 2. We need to find all businesses. Assuming we can group owners by business_id
        // Because UserRepository has findAllByBusinessId, we'll fetch all users and group them.
        // (If you have a BusinessRepository you prefer to use here, you can swap this out)
        const allUsers = await userRepo.findAll(); // Adjust if your method name differs
        const businesses = [...new Set(allUsers.map(u => u.business_id))].filter(Boolean);

        let pushCount = 0;

        for (const businessId of businesses) {
            try {
                // Get the OWNER or ADMIN's userId for this business to satisfy the service requirement
                const businessMembers = await userRepo.findAllByBusinessId(businessId);
                const owner = businessMembers.find(u => ['OWNER', 'ADMIN'].includes(u.role));
                
                if (!owner) continue;

                // 3. Generate Report for yesterday
                const report = await dailyReportService.generate({
                    userId: owner.user_id,
                    businessId: businessId,
                    date: ymd
                });

                if (!report) continue;

                // 4. Build Notification Body
                const revenue = report.today?.revenue || 0;
                const netProfit = report.today?.netProfit || 0;
                const change = report.comparison?.revenueChange || 0;
                const trend = change >= 0 ? `📈 +${change.toFixed(1)}%` : `📉 ${change.toFixed(1)}%`;

                const title = `📊 Yesterday's Report (${ymd})`;
                const body = `Revenue: ${formatCurrency(revenue)} (${trend})\nNet Profit: ${formatCurrency(netProfit)}`;

                // 5. Get tokens and push
                const membersWithTokens = await userRepo.findByBusinessIdWithPushTokens(businessId);
                // Send to OWNERS and ADMINS only
                const tokens = membersWithTokens
                    .filter(m => ['OWNER', 'ADMIN'].includes(m.role))
                    .map(m => m.push_token)
                    .filter(Boolean);

                if (tokens.length > 0) {
                    await sendBulkPushNotifications(tokens, title, body, {
                        screen: 'ReportDetail',
                        reportType: 'DAILY',
                        reportLabel: 'Daily Report',
                        date: ymd
                    });
                    pushCount += tokens.length;
                }
            } catch (err) {
                logger.error(`❌ [CRON] Daily Report failed for business ${businessId}: ${err.message}`);
            }
        }

        logger.info(`✅ [CRON] Morning Daily Report complete. Sent to ${pushCount} device(s).`);
    } catch (error) {
        logger.error('❌ [CRON] Morning Daily Report Job failed:', error.message);
    } finally {
        isRunning = false;
    }
}

function startDailyReportCron() {
    // 0 7 * * * = 7:00 AM every day
    cron.schedule('0 7 * * *', () => {
        runDailyReportJob();
    }, {
        scheduled: true,
        timezone: "Africa/Lagos"
    });

    logger.info('⏰ Morning Daily Report cron scheduled for 07:00 AM (Africa/Lagos).');
}

if (require.main === module) {
    runDailyReportJob(); // For manual testing
}

module.exports = { runDailyReportJob, startDailyReportCron };