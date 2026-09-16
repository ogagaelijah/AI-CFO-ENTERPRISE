// src/application/useCases/notifications/MarkReminderSentUseCase.js
// v2.0.0-prod — Writes wrapped in withTransaction.
//               Ownership checks read raw business_id.
//               Updates use raw columns, not entity methods.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class MarkReminderSentUseCase {
    constructor({
        notificationRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
    }) {
        this.notificationRepository = notificationRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        businessId,
        reminderId,
        type, // DEBTOR, CREDITOR, INVENTORY, DEBTOR_UPCOMING
        referenceId,
        channel = 'telegram',
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!reminderId && (!type || !referenceId)) {
            throw new Error('Either reminderId or type+referenceId is required');
        }

        // Verify the target record belongs to this business before any write.
        // Also used to reject cross-tenant reminders.
        if (type === 'DEBTOR' && referenceId) {
            const target = await this.debtorRepository.findById(referenceId);
            const targetBiz = Number(target?.business_id ?? target?.businessId);
            if (!target || targetBiz !== Number(businessId)) {
                throw new Error('Access denied: Debtor does not belong to this business');
            }
        } else if (type === 'CREDITOR' && referenceId) {
            const target = await this.creditorRepository.findById(referenceId);
            const targetBiz = Number(target?.business_id ?? target?.businessId);
            if (!target || targetBiz !== Number(businessId)) {
                throw new Error('Access denied: Creditor does not belong to this business');
            }
        } else if (type === 'INVENTORY' && referenceId) {
            const target = await this.inventoryRepository.findById(referenceId);
            const targetBiz = Number(target?.business_id ?? target?.businessId);
            if (!target || targetBiz !== Number(businessId)) {
                throw new Error('Access denied: Inventory item does not belong to this business');
            }
        }

        const now = new Date();
        const metadataPatch = { lastReminderSent: now };

        // All writes atomic. If any step fails, nothing persists.
        const result = await withTransaction(async () => {
            let finalReminderId = reminderId;

            if (reminderId) {
                // Existing reminder — verify ownership before update
                const existing = await this.notificationRepository.findById(reminderId);
                if (!existing) {
                    throw new Error('Reminder not found');
                }
                const existingBiz = Number(existing.business_id ?? existing.businessId);
                if (existingBiz !== Number(businessId)) {
                    throw new Error('Access denied: Reminder does not belong to this business');
                }

                await this.notificationRepository.update(reminderId, {
                    status: 'sent',
                    sent_at: now,
                    channel,
                });
            } else {
                // Create a new reminder record
                const Notification = require('../../../domain/entities/Notification');
                const reminder = new Notification({
                    businessId,
                    type,
                    referenceId,
                    sentAt: now,
                    channel,
                    status: 'sent',
                });
                const saved = await this.notificationRepository.create(reminder);
                finalReminderId = saved.id;
            }

            // Update the referenced entity's lastReminderSent metadata
            if (type === 'DEBTOR' && referenceId) {
                const debtor = await this.debtorRepository.findById(referenceId);
                const merged = {
                    ...(debtor?.metadata && typeof debtor.metadata === 'object' ? debtor.metadata : {}),
                    ...metadataPatch,
                };
                await this.debtorRepository.update(referenceId, { metadata: merged });
            } else if (type === 'CREDITOR' && referenceId) {
                const creditor = await this.creditorRepository.findById(referenceId);
                const merged = {
                    ...(creditor?.metadata && typeof creditor.metadata === 'object' ? creditor.metadata : {}),
                    ...metadataPatch,
                };
                await this.creditorRepository.update(referenceId, { metadata: merged });
            } else if (type === 'INVENTORY' && referenceId) {
                const item = await this.inventoryRepository.findById(referenceId);
                const merged = {
                    ...(item?.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
                    ...metadataPatch,
                };
                await this.inventoryRepository.update(referenceId, { metadata: merged });
            }

            const final = await this.notificationRepository.findById(finalReminderId);
            return { reminder: final };
        });

        return {
            success: true,
            reminder: result.reminder?.toJSON ? result.reminder.toJSON() : result.reminder,
            message: 'Reminder marked as sent',
        };
    }
}

module.exports = MarkReminderSentUseCase;