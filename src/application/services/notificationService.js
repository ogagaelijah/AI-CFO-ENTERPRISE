// src/application/services/notificationService.js
const logger = require('../../shared/utils/logger');

class NotificationService {
    constructor({ debtorRepository, notificationRepository }) {
        this.debtorRepository = debtorRepository;
        this.notificationRepository = notificationRepository;
    }

    // ✅ Create notification in database for web users
    async createNotification(userId, debtor, daysOverdue) {
        try {
            const notification = {
                user_id: userId,
                debtor_id: debtor.id,
                title: `⚠️ Overdue Debtor: ${debtor.customer_name}`,
                message: `${debtor.customer_name} owes ₦${debtor.balance_remaining.toLocaleString()} and is ${daysOverdue} days overdue. Please follow up.`,
                type: 'OVERDUE_DEBTOR',
                is_read: false,
                created_at: new Date().toISOString(),
            };

            const result = await this.notificationRepository.create(notification);
            logger.info(`✅ Notification created for user ${userId}: ${debtor.customer_name}`);
            return result;
        } catch (error) {
            logger.error('❌ Failed to create notification:', error.message);
            return null;
        }
    }

    // ✅ Check and create overdue notifications for web users
    async checkAndNotifyOverdueDebtors() {
        try {
            logger.info('🔍 Checking for overdue debtors...');
            
            const overdueDebtors = await this.debtorRepository.findAllOverdue();
            let notificationsCreated = 0;

            for (const debtor of overdueDebtors) {
                const daysOverdue = Math.ceil(
                    (new Date() - new Date(debtor.due_date)) / (1000 * 60 * 60 * 24)
                );

                if (daysOverdue === 1 || daysOverdue === 5 || daysOverdue % 7 === 0) {
                    const existing = await this.notificationRepository.findByDebtorAndDay(
                        debtor.id,
                        new Date().toISOString().split('T')[0]
                    );

                    if (!existing) {
                        await this.createNotification(debtor.user_id, debtor, daysOverdue);
                        notificationsCreated++;
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }

            logger.info(`✅ Created ${notificationsCreated} overdue notifications for web users`);
            return { notificationsCreated };

        } catch (error) {
            logger.error('❌ Error checking overdue debtors:', error.message);
            throw error;
        }
    }

    async getUnreadNotifications(userId) {
        try {
            return await this.notificationRepository.findUnreadByUserId(userId);
        } catch (error) {
            logger.error('❌ Error fetching unread notifications:', error.message);
            return [];
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            return await this.notificationRepository.markAsRead(notificationId, userId);
        } catch (error) {
            logger.error('❌ Error marking notification as read:', error.message);
            return false;
        }
    }

    async markAllAsRead(userId) {
        try {
            return await this.notificationRepository.markAllAsRead(userId);
        } catch (error) {
            logger.error('❌ Error marking all notifications as read:', error.message);
            return false;
        }
    }
}

module.exports = NotificationService;