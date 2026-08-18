// src/application/useCases/notifications/GetOverdueRemindersUseCase.js

class GetOverdueRemindersUseCase {
    constructor({
        debtorRepository,
        creditorRepository,
        notificationRepository,
    }) {
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.notificationRepository = notificationRepository;
    }

    async execute({ businessId }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const reminders = [];

        // =============================================
        // OVERDUE DEBTORS (Money owed to business)
        // =============================================
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const overdueDebtors = debtors.filter(d => d.isOverdue());

        for (const debtor of overdueDebtors) {
            const daysOverdue = debtor.dueDate
                ? Math.floor((new Date() - new Date(debtor.dueDate)) / (1000 * 60 * 60 * 24))
                : 0;

            // Check if reminder was already sent (within last 24 hours)
            const lastReminder = await this.notificationRepository.findLastReminder(
                businessId,
                'DEBTOR',
                debtor.id
            );

            const shouldSend = !lastReminder ||
                (new Date() - new Date(lastReminder.sentAt)) > (24 * 60 * 60 * 1000);

            if (shouldSend) {
                reminders.push({
                    type: 'DEBTOR',
                    referenceId: debtor.id,
                    title: `Payment due from customer`,
                    description: `₦${debtor.balanceRemaining.toLocaleString()} is overdue by ${daysOverdue} days`,
                    severity: daysOverdue > 30 ? 'critical' : daysOverdue > 15 ? 'high' : 'medium',
                    dueDate: debtor.dueDate,
                    daysOverdue,
                    amount: debtor.balanceRemaining,
                    customerId: debtor.customerId,
                    customerType: debtor.customerType,
                    action: 'record_payment',
                    actionData: { debtorId: debtor.id },
                });
            }
        }

        // =============================================
        // OVERDUE CREDITORS (Money owed by business)
        // =============================================
        const creditors = await this.creditorRepository.findByBusinessId(businessId);
        const overdueCreditors = creditors.filter(c => c.isOverdue());

        for (const creditor of overdueCreditors) {
            const daysOverdue = creditor.dueDate
                ? Math.floor((new Date() - new Date(creditor.dueDate)) / (1000 * 60 * 60 * 24))
                : 0;

            // Check if reminder was already sent (within last 24 hours)
            const lastReminder = await this.notificationRepository.findLastReminder(
                businessId,
                'CREDITOR',
                creditor.id
            );

            const shouldSend = !lastReminder ||
                (new Date() - new Date(lastReminder.sentAt)) > (24 * 60 * 60 * 1000);

            if (shouldSend) {
                reminders.push({
                    type: 'CREDITOR',
                    referenceId: creditor.id,
                    title: `Payment due to supplier`,
                    description: `₦${creditor.balanceRemaining.toLocaleString()} is overdue by ${daysOverdue} days`,
                    severity: daysOverdue > 30 ? 'critical' : daysOverdue > 15 ? 'high' : 'medium',
                    dueDate: creditor.dueDate,
                    daysOverdue,
                    amount: creditor.balanceRemaining,
                    supplierId: creditor.supplierId,
                    action: 'make_payment',
                    actionData: { creditorId: creditor.id },
                });
            }
        }

        // =============================================
        // UPCOMING DUE DATES (Within 7 days)
        // =============================================
        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Debtors due soon
        const debtorsDueSoon = debtors.filter(d => {
            if (!d.dueDate) return false;
            if (d.isFullyPaid()) return false;
            const dueDate = new Date(d.dueDate);
            return dueDate > now && dueDate <= sevenDaysFromNow;
        });

        for (const debtor of debtorsDueSoon) {
            const daysUntilDue = Math.floor((new Date(debtor.dueDate) - now) / (1000 * 60 * 60 * 24));
            reminders.push({
                type: 'DEBTOR_UPCOMING',
                referenceId: debtor.id,
                title: `Payment due in ${daysUntilDue} days`,
                description: `₦${debtor.balanceRemaining.toLocaleString()} is due on ${new Date(debtor.dueDate).toLocaleDateString()}`,
                severity: 'low',
                dueDate: debtor.dueDate,
                daysUntilDue,
                amount: debtor.balanceRemaining,
                customerId: debtor.customerId,
                action: 'view_debtor',
                actionData: { debtorId: debtor.id },
            });
        }

        // =============================================
        // LOW STOCK REMINDERS
        // =============================================
        const inventory = await this.inventoryRepository.findByBusinessId(businessId);
        const lowStockItems = inventory.filter(item => item.isLowStock());

        for (const item of lowStockItems) {
            // Check if reminder was already sent
            const lastReminder = await this.notificationRepository.findLastReminder(
                businessId,
                'INVENTORY',
                item.id
            );

            const shouldSend = !lastReminder ||
                (new Date() - new Date(lastReminder.sentAt)) > (24 * 60 * 60 * 1000);

            if (shouldSend) {
                reminders.push({
                    type: 'LOW_STOCK',
                    referenceId: item.id,
                    title: `${item.isOutOfStock() ? 'Out of Stock' : 'Low Stock'}: ${item.name}`,
                    description: `${item.quantity} units remaining (reorder level: ${item.reorderLevel})`,
                    severity: item.isOutOfStock() ? 'critical' : 'high',
                    amount: item.quantity,
                    itemName: item.name,
                    reorderLevel: item.reorderLevel,
                    action: 'view_inventory',
                    actionData: { itemId: item.id },
                });
            }
        }

        return {
            success: true,
            totalReminders: reminders.length,
            reminders: reminders.sort((a, b) => {
                const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }),
            summary: {
                critical: reminders.filter(r => r.severity === 'critical').length,
                high: reminders.filter(r => r.severity === 'high').length,
                medium: reminders.filter(r => r.severity === 'medium').length,
                low: reminders.filter(r => r.severity === 'low').length,
            },
        };
    }
}

module.exports = GetOverdueRemindersUseCase;