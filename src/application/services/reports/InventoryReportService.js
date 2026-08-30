// src/application/services/reports/InventoryReportService.js

const PeriodResolver = require('./foundation/PeriodResolver');
const ReportValidator = require('./foundation/ReportValidator');
const ReportResponseBuilder = require('./foundation/ReportResponseBuilder');
const ReconciliationCheck = require('./foundation/ReconciliationCheck');
const InventoryCalculator = require('./calculators/InventoryCalculator');

/**
 * InventoryReportService - Generates Inventory Valuation and Status Reports
 * 
 * Provides:
 * - Inventory summary (total items, quantity, value, potential profit, low stock)
 * - Product-level details (name, quantity, cost, selling price, margin, value, status)
 * - Low stock and out of stock alerts
 * - Product profitability metrics
 * 
 * Status Types:
 * - IN_STOCK: Quantity > reorder level
 * - LOW_STOCK: 0 < Quantity <= reorder level
 * - OUT_OF_STOCK: Quantity = 0
 */
class InventoryReportService {
    constructor({
        inventoryRepository = null,
        periodResolver = null,
        reportValidator = null,
        reportResponseBuilder = null,
        reconciliationCheck = null,
        inventoryCalculator = null,
    }) {
        // Use provided instances or create defaults
        this.inventoryRepository = inventoryRepository;

        this.periodResolver = periodResolver || new PeriodResolver();
        this.reportValidator = reportValidator || new ReportValidator();
        this.reportResponseBuilder = reportResponseBuilder || new ReportResponseBuilder({
            periodResolver: this.periodResolver,
            reportValidator: this.reportValidator,
        });
        this.reconciliationCheck = reconciliationCheck || new ReconciliationCheck();

        // Initialize calculator with repository if not provided
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

    /**
     * Generate Inventory Valuation Report
     * 
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} [params.asAtDate] - Date for inventory snapshot (default: today)
     * @param {boolean} [params.includeDetails] - Include product-level details
     * @param {number} [params.lowStockThreshold] - Threshold for low stock (default: 5)
     * @param {string} [params.sortBy] - 'name' | 'quantity' | 'value' | 'margin' (default: 'name')
     * @param {string} [params.filterStatus] - 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | null
     * @returns {Object} Inventory Report
     */
    async generate({
        userId,
        businessId,
        asAtDate = null,
        includeDetails = false,
        lowStockThreshold = 5,
        sortBy = 'name',
        filterStatus = null,
    }) {
        // Validate inputs
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

        // Get inventory data from calculator
        const inventoryData = await this.inventoryCalculator.calculate({
            userId,
            businessId,
            includeDetails: true,
            lowStockThreshold,
        });

        // Filter items if requested
        let items = inventoryData.details || [];

        if (filterStatus) {
            items = items.filter(item => item.status === filterStatus);
        }

        // Sort items
        items = this._sortItems(items, sortBy);

        // Calculate totals
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

        // Build response
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

    /**
     * Generate Inventory Movement Report
     * 
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @param {string} [params.productName] - Filter by product name
     * @param {number} [params.limit] - Limit results
     * @returns {Object} Inventory Movement Report
     */
    async generateMovements({
        userId,
        businessId,
        startDate,
        endDate,
        productName = null,
        limit = 100,
    }) {
        // Validate inputs
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

        // Get inventory data from calculator
        const inventoryData = await this.inventoryCalculator.calculate({
            userId,
            businessId,
            includeDetails: true,
        });

        let items = inventoryData.details || [];

        // Filter by product name if requested
        if (productName) {
            items = items.filter(item =>
                item.name.toLowerCase().includes(productName.toLowerCase())
            );
        }

        // Build movement details (simplified - using current snapshot)
        // In a full implementation, this would query inventory_movements table
        const movements = items.slice(0, limit).map(item => ({
            productName: item.name,
            currentQuantity: item.quantity,
            currentValue: item.value,
            avgCost: item.avgCost,
            status: item.status,
            reorderLevel: item.reorderLevel,
        }));

        const period = {
            startDate,
            endDate,
            label: `${startDate} - ${endDate}`,
        };

        return this.reportResponseBuilder.success({
            reportType: 'inventory_movements',
            period,
            data: {
                period: { startDate, endDate },
                totalProducts: items.length,
                movements,
                limit,
            },
        });
    }

    /**
     * Generate Low Stock Alert Report
     */
    async generateLowStock({ userId, businessId, threshold = 5 }) {
        return this.generate({
            userId,
            businessId,
            includeDetails: true,
            lowStockThreshold: threshold,
            filterStatus: 'LOW_STOCK',
            sortBy: 'quantity',
        });
    }

    /**
     * Generate Out of Stock Report
     */
    async generateOutOfStock({ userId, businessId }) {
        return this.generate({
            userId,
            businessId,
            includeDetails: true,
            filterStatus: 'OUT_OF_STOCK',
            sortBy: 'name',
        });
    }

    /**
     * Generate Product Profitability Report
     */
    async generateProfitability({ userId, businessId, sortBy = 'margin' }) {
        const result = await this.generate({
            userId,
            businessId,
            includeDetails: true,
            sortBy,
        });

        // Add profitability metrics to each item
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

    /**
     * Sort items by specified field with deterministic secondary sort
     */
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