// src/application/useCases/notifications/MarkReminderSentUseCase.js

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
        channel = 'telegram', // telegram, email, sms
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!reminderId && (!type || !referenceId)) {
            throw new Error('Either reminderId or type+referenceId is required');
        }

        let reminder;

        // If reminderId is provided, find existing reminder
        if (reminderId) {
            reminder = await this.notificationRepository.findById(reminderId);
            if (!reminder) {
                throw new Error('Reminder not found');
            }
            if (reminder.businessId !== businessId) {
                throw new Error('Access denied: Reminder does not belong to this business');
            }
        } else {
            // Create a new reminder record
            const Notification = require('../../../domain/entities/Notification');
            reminder = new Notification({
                businessId,
                type,
                referenceId,
                sentAt: new Date(),
                channel,
                status: 'sent',
            });
        }

        // Mark as sent
        reminder.markAsSent(channel);
        await this.notificationRepository.update(reminder.id, reminder);

        // Update reference entity if applicable
        if (type === 'DEBTOR' && referenceId) {
            const debtor = await this.debtorRepository.findById(referenceId);
            if (debtor && debtor.businessId === businessId) {
                if (!debtor.metadata) debtor.metadata = {};
                debtor.metadata.lastReminderSent = new Date();
                await this.debtorRepository.update(debtor.id, debtor);
            }
        }

        if (type === 'CREDITOR' && referenceId) {
            const creditor = await this.creditorRepository.findById(referenceId);
            if (creditor && creditor.businessId === businessId) {
                if (!creditor.metadata) creditor.metadata = {};
                creditor.metadata.lastReminderSent = new Date();
                await this.creditorRepository.update(creditor.id, creditor);
            }
        }

        if (type === 'INVENTORY' && referenceId) {
            const item = await this.inventoryRepository.findById(referenceId);
            if (item && item.businessId === businessId) {
                if (!item.metadata) item.metadata = {};
                item.metadata.lastReminderSent = new Date();
                await this.inventoryRepository.update(item.id, item);
            }
        }

        return {
            success: true,
            reminder: reminder.toJSON(),
            message: 'Reminder marked as sent',
        };
    }
}

module.exports = MarkReminderSentUseCase;