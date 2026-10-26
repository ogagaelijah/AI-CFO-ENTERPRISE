// src/application/services/notificationService.js
// v2.0.0-prod — Aggregates overdue debtors per business into ONE daily summary.
//               Notifies all owners/admins (fixes cashier-created debtor bell bug).
//               Message names debtors (1 / 2-4 / 5+ formats).

const logger = require('../../shared/utils/logger');
const UserRepository = require('../../infrastructure/database/sqlite/repositories/UserRepository');
const { sendBulkPushNotifications } = require('../../infrastructure/services/notifications/ExpoPushService');

class NotificationService {
    constructor({ debtorRepository, notificationRepository }) {
        this.debtorRepository = debtorRepository;
        this.notificationRepository = notificationRepository;
        this.userRepo = new UserRepository();
    }

    // ─────────────────────────────────────────────────────────────
    // Format the aggregated message based on how many debtors exist
    // ─────────────────────────────────────────────────────────────
    _buildAggregatedMessage(debtors) {
        const count = debtors.length;
        const totalOwed = debtors.reduce((sum, d) => sum + (Number(d.balance_remaining) || 0), 0);
        const totalFormatted = `₦${totalOwed.toLocaleString()}`;

        // Sort by amount descending for the "top N" preview
        const sorted = [...debtors].sort(
            (a, b) => (Number(b.balance_remaining) || 0) - (Number(a.balance_remaining) || 0)
        );

        if (count === 1) {
            const d = sorted[0];
            const days = Math.max(1, Math.ceil((new Date() - new Date(d.due_date)) / (1000 * 60 * 60 * 24)));
            return {
                title: `⚠️ Overdue Debtor: ${d.customer_name}`,
                message: `${d.customer_name} owes ₦${Number(d.balance_remaining).toLocaleString()} and is ${days} days overdue. Please follow up.`,
            };
        }

        if (count <= 4) {
            const names = sorted.map(d => d.customer_name);
            const namesList =
                names.length === 2
                    ? `${names[0]} and ${names[1]}`
                    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
            return {
                title: `⚠️ ${count} Overdue Debtors`,
                message: `${namesList} owe you a total of ${totalFormatted}. Please follow up.`,
            };
        }

        // 5+
        const top3 = sorted.slice(0, 3)
            .map(d => `${d.customer_name} (₦${Number(d.balance_remaining).toLocaleString()})`)
            .join(', ');
        return {
            title: `⚠️ ${count} Overdue Debtors`,
            message: `${count} debtors owe you ${totalFormatted} total. Top: ${top3}. Please follow up.`,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Create one notification per business + push to all devices
    // ─────────────────────────────────────────────────────────────
    async createAggregatedNotification(businessId, debtors) {
        try {
            const { title, message } = this._buildAggregatedMessage(debtors);
            const topDebtor = debtors.reduce((max, d) =>
                (Number(d.balance_remaining) || 0) > (Number(max.balance_remaining) || 0) ? d : max
            );

            // Get ALL active members of this business (for bell notification rows)
            const allMembers = await this.userRepo.findAllByBusinessId(businessId);
            const ownersAndAdmins = allMembers.filter(m => ['OWNER', 'ADMIN'].includes(m.role));

            // Fallback: if no owner/admin found, notify debtor's original user_id
            const recipients = ownersAndAdmins.length > 0
                ? ownersAndAdmins
                : (topDebtor.user_id ? [{ user_id: topDebtor.user_id, role: 'OWNER' }] : []);

            let created = 0;
            for (const member of recipients) {
                await this.notificationRepository.create({
                    user_id: member.user_id,
                    debtor_id: topDebtor.id,
                    title,
                    message,
                    type: 'OVERDUE_DEBTOR',
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
                created++;
            }

            logger.info(`✅ Aggregated notification created for ${created} recipient(s) in business ${businessId} (${debtors.length} debtors)`);

            // Push to all devices with a token in this business
            const membersWithTokens = await this.userRepo.findByBusinessIdWithPushTokens(businessId);
            const tokens = membersWithTokens.map(m => m.push_token).filter(Boolean);

            if (tokens.length > 0) {
                await sendBulkPushNotifications(
                    tokens,
                    title,
                    message,
                    { screen: 'Debtors', debtorId: topDebtor.id }
                );
                logger.info(`✅ Push sent to ${tokens.length} device(s) for business ${businessId}`);
            }

            return { created, pushSent: tokens.length };
        } catch (error) {
            logger.error(`❌ Failed to create aggregated notification for business ${businessId}: ${error.message}`);
            return { created: 0, pushSent: 0 };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Main entry: called by the cron at 7:00 AM
    // ─────────────────────────────────────────────────────────────
    async checkAndNotifyOverdueDebtors() {
        try {
            logger.info('🔍 Checking for overdue debtors...');

            const overdueDebtors = await this.debtorRepository.findAllOverdue();
            if (!overdueDebtors.length) {
                logger.info('✅ No overdue debtors found.');
                return { notificationsCreated: 0, businessesNotified: 0 };
            }

            // Group by business
            const byBusiness = new Map();
            for (const debtor of overdueDebtors) {
                if (!debtor.business_id) continue;
                if (!byBusiness.has(debtor.business_id)) byBusiness.set(debtor.business_id, []);
                byBusiness.get(debtor.business_id).push(debtor);
            }

            let totalCreated = 0;
            let businessesNotified = 0;

            for (const [businessId, debtors] of byBusiness.entries()) {
                // Cadence rule: only fire if at least one debtor hits day 1, 5, or %7===0
                const shouldFire = debtors.some(d => {
                    const daysOverdue = Math.ceil(
                        (new Date() - new Date(d.due_date)) / (1000 * 60 * 60 * 24)
                    );
                    return daysOverdue === 1 || daysOverdue === 5 || daysOverdue % 7 === 0;
                });

                if (!shouldFire) continue;

                // Dedup check: have we already notified this business today?
                // Use the top debtor's id — if any notification exists for this business today, skip.
                const topDebtor = debtors[0];
                const today = new Date().toISOString().split('T')[0];
                const existing = await this.notificationRepository.findByDebtorAndDay(topDebtor.id, today);
                if (existing) continue;

                const result = await this.createAggregatedNotification(businessId, debtors);
                totalCreated += result.created;
                if (result.created > 0) businessesNotified++;

                // Throttle between businesses
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.info(`✅ Created ${totalCreated} notifications across ${businessesNotified} business(es)`);
            return { notificationsCreated: totalCreated, businessesNotified };
        } catch (error) {
            logger.error('❌ Error checking overdue debtors:', error.message);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Single-debtor helper kept for backward compatibility
    // (in case other code calls createNotification directly)
    // ─────────────────────────────────────────────────────────────
    async createNotification(userId, debtor, daysOverdue, businessId) {
        try {
            const notification = {
                user_id: userId,
                debtor_id: debtor.id,
                title: `⚠️ Overdue Debtor: ${debtor.customer_name}`,
                message: `${debtor.customer_name} owes ₦${Number(debtor.balance_remaining).toLocaleString()} and is ${daysOverdue} days overdue. Please follow up.`,
                type: 'OVERDUE_DEBTOR',
                is_read: false,
                created_at: new Date().toISOString(),
            };
            const result = await this.notificationRepository.create(notification);
            logger.info(`✅ Single notification created for user ${userId}`);

            if (businessId) {
                const membersWithTokens = await this.userRepo.findByBusinessIdWithPushTokens(businessId);
                const tokens = membersWithTokens.map(m => m.push_token).filter(Boolean);
                if (tokens.length > 0) {
                    await sendBulkPushNotifications(
                        tokens,
                        notification.title,
                        notification.message,
                        { screen: 'Debtors', debtorId: debtor.id }
                    );
                }
            }
            return result;
        } catch (error) {
            logger.error('❌ Failed to create notification:', error.message);
            return null;
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