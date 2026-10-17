// src/application/services/reports/InventoryReportService.js
// v2.0.2-prod — Fixes movement field access: entity returns camelCase
//               (inventoryItemId, movementType) not snake_case.
// v2.0.1-prod — Replaces generateMovements() stub with real implementation.
// v2.0.0-prod — Adds generateMovementReport() with per-item ledger snapshots.

const PeriodResolver = require('./foundation/PeriodResolver');
const ReportValidator = require('./foundation/ReportValidator');
const ReportResponseBuilder = require('./foundation/ReportResponseBuilder');
const ReconciliationCheck = require('./foundation/ReconciliationCheck');
const InventoryCalculator = require('./calculators/InventoryCalculator');

class InventoryReportService {
    constructor({
        inventoryRepository = null,
        inventoryMovementRepository = null,
        periodResolver = null,
        reportValidator = null,
        reportResponseBuilder = null,
        reconciliationCheck = null,
        inventoryCalculator = null,
    }) {
        this.inventoryRepository = inventoryRepository;
        this.inventoryMovementRepository = inventoryMovementRepository;

        this.periodResolver = periodResolver || new PeriodResolver();
        this.reportValidator = reportValidator || new ReportValidator();
        this.reportResponseBuilder = reportResponseBuilder || new ReportResponseBuilder({
            periodResolver: this.periodResolver,
            reportValidator: this.reportValidator,
        });
        this.reconciliationCheck = reconciliationCheck || new ReconciliationCheck();

        if (inventoryCalculator) {
            this.inventoryCalculator = inventoryCalculator;
        } else if (this.inventoryRepository) {
            this.inventoryCalculator = new InventoryCalculator({
                inventoryRepository: this.inventoryRepository,
            });
        } else {
            throw new Error('InventoryReportService requires inventoryRepository or inventoryCalculator');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Valuation report (existing — unchanged)
    // ─────────────────────────────────────────────────────────────

    async generate({
        userId,
        businessId,
        asAtDate = null,
        includeDetails = false,
        lowStockThreshold = 5,
        sortBy = 'name',
        filterStatus = null,
    }) {
        const validation = this.reportValidator.validate({
            userId,
            businessId,
            period: 'daily',
            referenceDate: asAtDate || new Date().toISOString().split('T')[0],
        });

        if (!validation.valid) {
            return this.reportResponseBuilder.error({
                reportType: 'inventory',
                period: { startDate: asAtDate, endDate: asAtDate, label: asAtDate || 'Today' },
                errors: validation.errors,
            });
        }

        const inventoryData = await this.inventoryCalculator.calculate({
            userId,
            businessId,
            includeDetails: true,
            lowStockThreshold,
        });

        let items = inventoryData.details || [];

        if (filterStatus) {
            items = items.filter(item => item.status === filterStatus);
        }

        items = this._sortItems(items, sortBy);

        const summary = {
            totalItems: inventoryData.totalItems,
            totalQuantity: inventoryData.totalQuantity,
            totalCostValue: inventoryData.totalCostValue,
            totalSellingValue: inventoryData.totalSellingValue,
            totalPotentialProfit: inventoryData.totalPotentialProfit,
            lowStockCount: inventoryData.lowStockCount,
            outOfStockCount: inventoryData.outOfStockCount,
            averageCostPerItem: inventoryData.averageCostPerItem,
            averageSellingPrice: inventoryData.averageSellingPrice,
            overallMargin: inventoryData.overallMargin,
        };

        const reportData = {
            asAtDate: asAtDate || new Date().toISOString().split('T')[0],
            lowStockThreshold,
            summary,
            items: includeDetails ? items : null,
            itemCount: items.length,
            filteredBy: filterStatus || 'all',
            sortedBy: sortBy,
        };

        const period = {
            startDate: asAtDate || new Date().toISOString().split('T')[0],
            endDate: asAtDate || new Date().toISOString().split('T')[0],
            label: `As at ${asAtDate || 'Today'}`,
        };

        return this.reportResponseBuilder.success({
            reportType: 'inventory',
            period,
            data: reportData,
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Movement report (real implementation)
    // ─────────────────────────────────────────────────────────────

    async generateMovementReport({
        userId,
        businessId,
        startDate,
        endDate,
        inventoryItemId = null,
        movementType = null,
        page = 1,
        limit = 50,
    }) {
        if (!this.inventoryMovementRepository) {
            throw new Error('InventoryReportService: inventoryMovementRepository is required for movement reports');
        }

        const validation = this.reportValidator.validate({
            userId,
            businessId,
            period: 'custom',
            startDate,
            endDate,
        });

        if (!validation.valid) {
            return this.reportResponseBuilder.error({
                reportType: 'inventory_movements',
                period: { startDate, endDate, label: `${startDate} - ${endDate}` },
                errors: validation.errors,
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Load all inventory items for the business
        const allItems = await this._loadInventoryItems(businessId);
        const targetItems = inventoryItemId
            ? allItems.filter(i => Number(i.id) === Number(inventoryItemId))
            : allItems;

        // 2. Load all movements for the period
        const movementsInPeriod = await this._loadMovements({
            businessId,
            start,
            end,
            movementType,
        });

        // 3. Per-item summaries
        const itemSummaries = [];
        let overallCostIn = 0;
        let overallCostOut = 0;

        for (const item of targetItems) {
            // ★ FIX: entity uses camelCase — inventoryItemId, not inventory_item_id
            const itemMovements = movementsInPeriod.filter(
                m => Number(m.inventoryItemId) === Number(item.id)
            );

            const openingQty = await this._sumMovementsBefore({
                inventoryItemId: item.id,
                before: start,
            });

            let totalIn = 0;
            let totalOut = 0;
            let adjustments = 0;
            let costIn = 0;
            let costOut = 0;

            for (const m of itemMovements) {
                // ★ FIX: camelCase throughout
                const qty = Number(m.quantity) || 0;
                const totalCost = Number(m.totalCost) || 0;
                switch (m.movementType) {
                    case 'IN':
                    case 'RETURN':
                        totalIn += qty;
                        costIn += totalCost;
                        break;
                    case 'OUT':
                    case 'DAMAGE':
                    case 'LOSS':
                    case 'TRANSFER':
                        totalOut += qty;
                        costOut += totalCost;
                        break;
                    case 'ADJUSTMENT_IN':
                        totalIn += qty;
                        costIn += totalCost;
                        adjustments += qty;
                        break;
                    case 'ADJUSTMENT_OUT':
                        totalOut += qty;
                        costOut += totalCost;
                        adjustments -= qty;
                        break;
                    default:
                        break;
                }
            }

            const closingQty = openingQty + totalIn - totalOut;
            const avgCost = Number(item.cost_price) || 0;

            overallCostIn += costIn;
            overallCostOut += costOut;

            itemSummaries.push({
                inventoryItemId: item.id,
                itemName: item.item_name,
                openingQuantity: openingQty,
                openingValue: openingQty * avgCost,
                totalIn,
                totalOut,
                adjustments,
                closingQuantity: closingQty,
                closingValue: closingQty * avgCost,
                weightedAvgCost: avgCost,
                movements: itemMovements.map(m => ({
                    id: m.id,
                    movementType: m.movementType,
                    quantity: Number(m.quantity) || 0,
                    unitCost: Number(m.unitCost) || 0,
                    totalCost: Number(m.totalCost) || 0,
                    quantityBefore: Number(m.quantityBefore) || 0,
                    quantityAfter: Number(m.quantityAfter) || 0,
                    referenceType: m.referenceType,
                    referenceId: m.referenceId,
                    reason: m.reason || '',
                    notes: m.notes || '',
                    createdAt: m.createdAt,
                })),
            });
        }

        // 4. Paginate
        const total = itemSummaries.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * limit;
        const pagedItems = itemSummaries.slice(offset, offset + limit);

        // 5. Summary
        const summary = {
            totalIn: itemSummaries.reduce((s, i) => s + i.totalIn, 0),
            totalOut: itemSummaries.reduce((s, i) => s + i.totalOut, 0),
            totalAdjustments: itemSummaries.reduce((s, i) => s + i.adjustments, 0),
            netChange: itemSummaries.reduce((s, i) => s + (i.totalIn - i.totalOut), 0),
            totalCostIn: overallCostIn,
            totalCostOut: overallCostOut,
        };

        return {
            success: true,
            data: {
                period: { startDate, endDate },
                summary,
                items: pagedItems,
                pagination: {
                    page: safePage,
                    limit,
                    total,
                    totalPages,
                    hasNext: safePage < totalPages,
                    hasPrev: safePage > 1,
                },
            },
        };
    }

    async generateMovements(params) {
        return this.generateMovementReport(params);
    }

    // ─────────────────────────────────────────────────────────────
    // Other reports (unchanged)
    // ─────────────────────────────────────────────────────────────

    async generateLowStock({ userId, businessId, threshold = 5 }) {
        return this.generate({
            userId, businessId, includeDetails: true,
            lowStockThreshold: threshold,
            filterStatus: 'LOW_STOCK', sortBy: 'quantity',
        });
    }

    async generateOutOfStock({ userId, businessId }) {
        return this.generate({
            userId, businessId, includeDetails: true,
            filterStatus: 'OUT_OF_STOCK', sortBy: 'name',
        });
    }

    async generateProfitability({ userId, businessId, sortBy = 'margin' }) {
        const result = await this.generate({
            userId, businessId, includeDetails: true, sortBy,
        });

        if (result.status === 'SUCCESS' && result.data.items) {
            result.data.items = result.data.items.map(item => ({
                ...item,
                profitPerUnit: item.sellingPrice - item.costPrice,
                margin: item.margin,
                returnOnCost: item.costPrice > 0 ? (item.margin / 100) * (item.sellingPrice / item.costPrice) : 0,
            }));
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    async _loadInventoryItems(businessId) {
        if (this.inventoryRepository && this.inventoryRepository.findByBusinessId) {
            return await this.inventoryRepository.findByBusinessId(businessId);
        }
        return [];
    }

    async _loadMovements({ businessId, start, end, movementType }) {
        if (!this.inventoryMovementRepository) return [];
        const opts = { startDate: start, endDate: end };
        if (movementType) opts.movementType = movementType;
        return await this.inventoryMovementRepository.findByBusinessId(businessId, opts);
    }

    async _sumMovementsBefore({ inventoryItemId, before }) {
        if (!this.inventoryMovementRepository) return 0;
        const all = await this.inventoryMovementRepository.findByInventoryItemId(inventoryItemId, {});
        let sum = 0;
        const beforeMs = before.getTime();
        for (const m of all) {
            // ★ FIX: camelCase createdAt
            const createdAt = m.createdAt ? new Date(m.createdAt).getTime() : 0;
            if (createdAt >= beforeMs) continue;
            const qty = Number(m.quantity) || 0;
            // ★ FIX: camelCase movementType
            switch (m.movementType) {
                case 'IN':
                case 'ADJUSTMENT_IN':
                case 'RETURN':
                    sum += qty;
                    break;
                case 'OUT':
                case 'ADJUSTMENT_OUT':
                case 'DAMAGE':
                case 'LOSS':
                case 'TRANSFER':
                    sum -= qty;
                    break;
                default:
                    break;
            }
        }
        return sum;
    }

    _sortItems(items, sortBy) {
        const sortMap = {
            name: (a, b) => a.name.localeCompare(b.name),
            quantity: (a, b) => {
                if (b.quantity !== a.quantity) return b.quantity - a.quantity;
                return a.name.localeCompare(b.name);
            },
            value: (a, b) => {
                if (b.value !== a.value) return b.value - a.value;
                return a.name.localeCompare(b.name);
            },
            margin: (a, b) => {
                if (b.margin !== a.margin) return b.margin - a.margin;
                return a.name.localeCompare(b.name);
            },
            costPrice: (a, b) => {
                if (b.costPrice !== a.costPrice) return b.costPrice - a.costPrice;
                return a.name.localeCompare(b.name);
            },
            sellingPrice: (a, b) => {
                if (b.sellingPrice !== a.sellingPrice) return b.sellingPrice - a.sellingPrice;
                return a.name.localeCompare(b.name);
            },
        };

        const sortFn = sortMap[sortBy] || sortMap.name;
        return items.sort(sortFn);
    }
}

module.exports = InventoryReportService;