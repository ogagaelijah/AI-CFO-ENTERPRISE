// src/jobs/overdueNotificationJob.js
// v2.0.0-prod — Runs daily at 07:00 AM (Africa/Lagos). 
//               Robust error handling, prevents overlapping runs.

const cron = require('node-cron');
const NotificationService = require('../application/services/notificationService');
const DebtorRepository = require('../infrastructure/database/sqlite/repositories/DebtorRepository');
const NotificationRepository = require('../infrastructure/database/sqlite/repositories/NotificationRepository');
const logger = require('../shared/utils/logger');

// Initialize repositories
const debtorRepo = new DebtorRepository();
const notificationRepo = new NotificationRepository();

// Initialize notification service
const notificationService = new NotificationService({
    debtorRepository: debtorRepo,
    notificationRepository: notificationRepo
});

let isRunning = false;

async function runOverdueNotification() {
    if (isRunning) {
        logger.warn('⚠️ Overdue notification job is already running. Skipping.');
        return { notificationsCreated: 0 };
    }

    isRunning = true;
    try {
        console.log('🕐 [CRON] Running overdue notification check for web users...');
        const result = await notificationService.checkAndNotifyOverdueDebtors();
        console.log(`✅ [CRON] Overdue notification check complete. Created ${result.notificationsCreated} notifications.`);
        return result;
    } catch (error) {
        console.error('❌ [CRON] Overdue notification job failed:', error.message);
        return { notificationsCreated: 0, error: error.message };
    } finally {
        isRunning = false;
    }
}

// Schedule: Every day at 7:00 AM Africa/Lagos Time
function startOverdueNotificationCron() {
    // 0 7 * * * = 7:00 AM every day
    cron.schedule('0 7 * * *', () => {
        runOverdueNotification();
    }, {
        scheduled: true,
        timezone: "Africa/Lagos" // Ensures it runs at 7:00 AM WAT regardless of server location
    });

    logger.info('⏰ Overdue notification cron scheduled for 07:00 AM (Africa/Lagos).');
}

// If run directly (for manual testing)
if (require.main === module) {
    runOverdueNotification();
}

module.exports = { runOverdueNotification, startOverdueNotificationCron };