// src/application/services/reports/AgingService.js

const PeriodResolver = require('./foundation/PeriodResolver');
const ReportValidator = require('./foundation/ReportValidator');
const ReportResponseBuilder = require('./foundation/ReportResponseBuilder');
const ReconciliationCheck = require('./foundation/ReconciliationCheck');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');

/**
 * AgingService - Generates AR and AP Aging Reports
 * 
 * Provides:
 * - Accounts Receivable aging (debtors by age buckets)
 * - Accounts Payable aging (creditors by age buckets)
 * - Summary totals per bucket
 * - Detail lines per customer/supplier
 * 
 * Aging Buckets:
 * - Current (0 days)
 * - 1-30 Days
 * - 31-60 Days
 * - 61-90 Days
 * - 90+ Days
 */
class AgingService {
    constructor({
        debtorRepository = null,
        creditorRepository = null,
        periodResolver = null,
        reportValidator = null,
        reportResponseBuilder = null,
        reconciliationCheck = null,
        arCalculator = null,
        apCalculator = null,
    }) {
        // Use provided instances or create defaults
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        
        this.periodResolver = periodResolver || new PeriodResolver();
        this.reportValidator = reportValidator || new ReportValidator();
        this.reportResponseBuilder = reportResponseBuilder || new ReportResponseBuilder({
            periodResolver: this.periodResolver,
            reportValidator: this.reportValidator,
        });
        this.reconciliationCheck = reconciliationCheck || new ReconciliationCheck();
        
        // Initialize calculators with repositories if not provided
        if (arCalculator) {
            this.arCalculator = arCalculator;
        } else if (this.debtorRepository) {
            this.arCalculator = new ARCalculator({ debtorRepository: this.debtorRepository });
        } else {
            throw new Error('ARCalculator requires debtorRepository');
        }
        
        if (apCalculator) {
            this.apCalculator = apCalculator;
        } else if (this.creditorRepository) {
            this.apCalculator = new APCalculator({ creditorRepository: this.creditorRepository });
        } else {
            throw new Error('APCalculator requires creditorRepository');
        }
    }

    /**
     * Generate AR Aging Report
     * 
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} [params.asAtDate] - Date for aging snapshot (default: today)
     * @param {boolean} [params.includeDetails] - Include customer-level details
     * @returns {Object} AR Aging Report
     */
    async generateAR({ userId, businessId, asAtDate = null, includeDetails = false }) {
        // Validate inputs
        const validation = this.reportValidator.validate({
            userId,
            businessId,
            period: 'daily',
            referenceDate: asAtDate || new Date().toISOString().split('T')[0],
        });
        
        if (!validation.valid) {
            return this.reportResponseBuilder.error({
                reportType: 'ar_aging',
                period: { startDate: asAtDate, endDate: asAtDate, label: asAtDate || 'Today' },
                errors: validation.errors,
            });
        }

        // Get AR data from calculator
        const arData = await this.arCalculator.calculate({
            userId,
            businessId,
            asAtDate,
            includeDetails: true,
            includeAging: true,
        });

        // Build aging buckets from calculator data
        const buckets = this._buildBuckets(arData.aging || { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, daysOver90: 0 });

        // Build detail lines if requested
        let details = null;
        if (includeDetails && arData.details) {
            details = arData.details.map(d => {
                const daysOverdue = this._calculateDaysOverdue(d.dueDate);
                const bucket = this._getBucket(daysOverdue);
                return {
                    customerName: d.customerName,
                    totalAmount: d.totalOwed,
                    amountPaid: d.amountPaid,
                    balance: d.balanceRemaining,
                    dueDate: d.dueDate,
                    daysOverdue,
                    bucket,
                    status: d.status,
                };
            }).sort((a, b) => b.balance - a.balance);
        }

        const reportData = {
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
            summary: {
                totalOutstanding: arData.totalOutstanding,
                activeCount: arData.activeCount,
                overdueAmount: arData.overdueAmount,
                overdueCount: arData.overdueCount,
                averageBalance: arData.averageBalance,
                buckets,
            },
            details,
        };

        const period = {
            startDate: asAtDate || new Date().toISOString().split('T')[0],
            endDate: asAtDate || new Date().toISOString().split('T')[0],
            label: `As at ${asAtDate || 'Today'}`,
        };

        return this.reportResponseBuilder.success({
            reportType: 'ar_aging',
            period,
            data: reportData,
        });
    }

    /**
     * Generate AP Aging Report
     * 
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} [params.asAtDate] - Date for aging snapshot (default: today)
     * @param {boolean} [params.includeDetails] - Include supplier-level details
     * @returns {Object} AP Aging Report
     */
    async generateAP({ userId, businessId, asAtDate = null, includeDetails = false }) {
        // Validate inputs
        const validation = this.reportValidator.validate({
            userId,
            businessId,
            period: 'daily',
            referenceDate: asAtDate || new Date().toISOString().split('T')[0],
        });
        
        if (!validation.valid) {
            return this.reportResponseBuilder.error({
                reportType: 'ap_aging',
                period: { startDate: asAtDate, endDate: asAtDate, label: asAtDate || 'Today' },
                errors: validation.errors,
            });
        }

        // Get AP data from calculator
        const apData = await this.apCalculator.calculate({
            userId,
            businessId,
            asAtDate,
            includeDetails: true,
            includeAging: true,
        });

        // Build aging buckets from calculator data
        const buckets = this._buildBuckets(apData.aging || { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, daysOver90: 0 });

        // Build detail lines if requested
        let details = null;
        if (includeDetails && apData.details) {
            details = apData.details.map(d => {
                const daysOverdue = this._calculateDaysOverdue(d.dueDate);
                const bucket = this._getBucket(daysOverdue);
                return {
                    supplierName: d.supplierName,
                    totalAmount: d.totalOwed,
                    amountPaid: d.amountPaid,
                    balance: d.balanceRemaining,
                    dueDate: d.dueDate,
                    daysOverdue,
                    bucket,
                    status: d.status,
                };
            }).sort((a, b) => b.balance - a.balance);
        }

        const reportData = {
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
            summary: {
                totalOutstanding: apData.totalOutstanding,
                activeCount: apData.activeCount,
                overdueAmount: apData.overdueAmount,
                overdueCount: apData.overdueCount,
                averageBalance: apData.averageBalance,
                buckets,
            },
            details,
        };

        const period = {
            startDate: asAtDate || new Date().toISOString().split('T')[0],
            endDate: asAtDate || new Date().toISOString().split('T')[0],
            label: `As at ${asAtDate || 'Today'}`,
        };

        return this.reportResponseBuilder.success({
            reportType: 'ap_aging',
            period,
            data: reportData,
        });
    }

    /**
     * Generate both AR and AP Aging Reports in one call
     */
    async generateBoth({ userId, businessId, asAtDate = null, includeDetails = false }) {
        const [ar, ap] = await Promise.all([
            this.generateAR({ userId, businessId, asAtDate, includeDetails }),
            this.generateAP({ userId, businessId, asAtDate, includeDetails }),
        ]);

        const period = {
            startDate: asAtDate || new Date().toISOString().split('T')[0],
            endDate: asAtDate || new Date().toISOString().split('T')[0],
            label: `As at ${asAtDate || 'Today'}`,
        };

        return this.reportResponseBuilder.success({
            reportType: 'aging_both',
            period,
            data: {
                accountsReceivable: ar.data,
                accountsPayable: ap.data,
            },
        });
    }

    /**
     * Build aging buckets from calculator data
     */
    _buildBuckets(aging) {
        return {
            current: aging.current || 0,
            days1to30: aging.days1to30 || 0,
            days31to60: aging.days31to60 || 0,
            days61to90: aging.days61to90 || 0,
            daysOver90: aging.daysOver90 || 0,
            total: (aging.current || 0) + (aging.days1to30 || 0) + (aging.days31to60 || 0) + 
                   (aging.days61to90 || 0) + (aging.daysOver90 || 0),
        };
    }

    /**
     * Calculate days overdue from due date
     */
    _calculateDaysOverdue(dueDate) {
        if (!dueDate) return 0;
        const now = new Date();
        const due = new Date(dueDate);
        const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }

    /**
     * Get aging bucket from days overdue
     */
    _getBucket(daysOverdue) {
        if (daysOverdue <= 0) return 'current';
        if (daysOverdue <= 30) return '1-30';
        if (daysOverdue <= 60) return '31-60';
        if (daysOverdue <= 90) return '61-90';
        return '90+';
    }
}

module.exports = AgingService;