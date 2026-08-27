// src/jobs/overdueNotificationJob.js
const NotificationService = require('../application/services/NotificationService');
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

async function runOverdueNotification() {
    try {
        console.log('🕐 Running overdue notification check for web users...');
        const result = await notificationService.checkAndNotifyOverdueDebtors();
        console.log(`✅ Overdue notification check complete. Created ${result.notificationsCreated} notifications for web users.`);
        return result;
    } catch (error) {
        console.error('❌ Overdue notification job failed:', error.message);
        return { notificationsCreated: 0, error: error.message };
    }
}

// If run directly
if (require.main === module) {
    runOverdueNotification();
}

module.exports = { runOverdueNotification };