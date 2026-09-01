// src/application/services/forecast/core/InventoryForecastCalculator.js
// Phase 5.4.3 - Inventory Engine | SSOT: 7/30/90

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts');
const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

/**
 * InventoryForecastCalculator - Evaluates inventory levels and depletion runways
 * Production-ready with zero-crash guarantees | SSOT 7/30/90
 */
class InventoryForecastCalculator {
    constructor({ reportService = null, inventoryRepository = null, salesVolumeForecast = null, trendAnalyzer = null, volatilityAnalyzer = null } = {}) {
        this.reportService = reportService;
        this.inventoryRepository = inventoryRepository;
        this.salesVolumeForecast = salesVolumeForecast;
        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
    }

    async forecast(params = {}) {
        const { userId, businessId, salesVolumeForecastData, historicalInventory = [], purchaseHistory = [], horizon = '30D', reorderLevel = null, safetyStock = null, leadTimeDays = null, period = null, productId = null } = params;
        if (!salesVolumeForecastData) { return ForecastContracts.insufficientData('inventory', 'Inventory', 'MISSING_INPUT_DATA'); }

        const demand = this._safeNumber(salesVolumeForecastData.forecast || 0);
        const inventoryPoints = this._safeArray(historicalInventory).length;
        const purchasePoints = this._safeArray(purchaseHistory).length;
        const sufficiency = ForecastContracts.getDataSufficiency(Math.max(inventoryPoints, purchasePoints));
        if (sufficiency === DATA_SUFFICIENCY.INSUFFICIENT) { return ForecastContracts.insufficientData('inventory', 'Inventory'); }

        let currentStock = 0;
        if (inventoryPoints > 0) {
            const lastRecord = historicalInventory[inventoryPoints - 1];
            currentStock = this._safeNumber(lastRecord?.value?? lastRecord?.quantity?? lastRecord?.stock?? 0);
        }

        // SCALE FIX: Product-scoped repo query to prevent DB collection sweep
        if (currentStock === 0 && this.inventoryRepository && userId) {
            try {
                const items = productId? await this.inventoryRepository.findByProductId?.(productId)?? [] : await this.inventoryRepository.findByUserId(userId)?? [];
                const targetItems = Array.isArray(items)? items : [items];
                currentStock = targetItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
            } catch (error) { console.warn('⚠️ InventoryForecastCalculator: Could not fetch inventory:', error.message); }
        }

        const purchaseRate = this._calculatePurchaseRate(purchaseHistory, demand);
        const forecastedStock = Math.max(0, currentStock + purchaseRate - demand);
        const reorderLevelFinal = reorderLevel?? 20;
        const safetyStockFinal = safetyStock?? 10;
        const leadTimeDaysFinal = leadTimeDays?? 7;

        const status = this._determineStatus(forecastedStock, reorderLevelFinal, safetyStockFinal, leadTimeDaysFinal, demand);
        const volatility = this.volatilityAnalyzer.analyze([currentStock, purchaseRate, demand].filter(v => v > 0));
        const confidence = this._calculateConfidence(salesVolumeForecastData.confidence, inventoryPoints, purchasePoints, volatility);
        const bounds = this._calculateBounds(forecastedStock, demand, volatility);
        const forecastPeriod = period || this._buildPeriod(horizon);
        const assumptions = this._buildAssumptions(currentStock, purchaseRate, demand, reorderLevelFinal, safetyStockFinal, leadTimeDaysFinal);
        const risks = this._detectRisks(forecastedStock, currentStock, reorderLevelFinal, safetyStockFinal, demand, sufficiency);

        return ForecastContracts.createForecast({
            metric: 'inventory', displayName: 'Inventory', period: forecastPeriod, forecast: forecastedStock,
            lowerBound: bounds.lower, upperBound: bounds.upper, method: 'combined', confidence,
            historicalBasis: { periodsUsed: Math.max(inventoryPoints, purchasePoints), average: currentStock, trend: null, currentStock, demand, purchaseRate, forecastedStock, reorderLevel: reorderLevelFinal, safetyStock: safetyStockFinal },
            assumptions, dataStatus: sufficiency, risks,
            metadata: { horizon, currentStock, demand, purchaseRate, forecastedStock, reorderLevel: reorderLevelFinal, safetyStock: safetyStockFinal, leadTimeDays: leadTimeDaysFinal, status },
        });
    }

    _calculatePurchaseRate(purchaseHistory, demand) {
        const safePurchases = this._safeArray(purchaseHistory);
        if (safePurchases.length > 0) {
            const purchases = safePurchases.map(p => this._safeNumber(p?.value?? p?.quantity?? p?.amount?? 0));
            const avgPurchase = purchases.reduce((a, b) => a + b, 0) / purchases.length;
            return demand > 0? Math.max(avgPurchase, demand * 0.8) : avgPurchase;
        }
        return demand * 0.8;
    }

    _determineStatus(forecastedStock, reorderLevel, safetyStock, leadTimeDays, demand) {
        if (forecastedStock <= 0) { return { level: 'OUT_OF_STOCK', label: 'Out of Stock', action: 'Immediate reorder required' }; }
        if (forecastedStock <= safetyStock) { return { level: 'CRITICAL', label: 'Critical', action: 'Urgent reorder required' }; }
        const daysUntilReorder = demand > 0? ((forecastedStock - reorderLevel) / demand) * 30 : null; // FIX: null not Infinity
        if (forecastedStock <= reorderLevel) { return { level: 'REORDER', label: 'Reorder Needed', action: `Reorder required within ${Math.ceil(leadTimeDays)} days`, daysUntilReorder }; }
        if (forecastedStock <= reorderLevel * 1.5) { return { level: 'APPROACHING', label: 'Approaching Reorder Point', action: `Consider reordering in ${Math.ceil(daysUntilReorder)} days`, daysUntilReorder }; }
        return { level: 'HEALTHY', label: 'Healthy', action: 'Maintain current inventory levels', daysUntilReorder };
    }

    _calculateConfidence(salesVolumeConfidence, inventoryDataPoints, purchaseDataPoints, volatility) {
        let score = 50;
        if (salesVolumeConfidence?.score!== undefined) { score += (salesVolumeConfidence.score - 50) * 0.4; }
        if (inventoryDataPoints >= 30) score += 10; else if (inventoryDataPoints >= 14) score += 5; else if (inventoryDataPoints < 7) score -= 10;
        if (purchaseDataPoints >= 14) score += 5; else if (purchaseDataPoints < 7) score -= 5;
        if (volatility?.available) { if (volatility.volatility < 0.2) score += 10; else if (volatility.volatility > 0.5) score -= 10; }
        score = Math.max(0, Math.min(100, score));
        return ForecastContracts.createConfidence({
            score, factors: { historicalDataPoints: Math.max(inventoryDataPoints, purchaseDataPoints), dataConsistency: score > 70? 'HIGH' : score > 40? 'MODERATE' : 'LOW', volatility: volatility?.available? volatility.volatility * 100 : 50, trendStability: 50, seasonalityEvidence: 0, priorAccuracy: 0 },
        });
    }

    _calculateBounds(forecastedStock, demand, volatility) {
        const baseMargin = volatility?.available? Math.max(0.15, volatility.volatility * 0.5 + 0.15) : 0.25;
        const margin = demand > 0? Math.max(baseMargin, 10 / demand) : baseMargin; // FIX: Guard against /0
        return { lower: Math.max(0, forecastedStock * (1 - margin)), upper: forecastedStock * (1 + margin) + 10 };
    }

    _buildPeriod(horizon) {
        const now = new Date(); const start = new Date(now); const end = new Date(now);
        const days = { '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365 };
        const daysValue = days[horizon] || 30; end.setDate(end.getDate() + daysValue);
        const labels = { '7D': '7 Days', '14D': '14 Days', '30D': '30 Days', '60D': '60 Days', '90D': '90 Days', '6M': '6 Months', '12M': '12 Months' };
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0], label: labels[horizon] || '30 Days', horizon, days: daysValue };
    }

    _buildAssumptions(currentStock, purchaseRate, demand, reorderLevel, safetyStock, leadTimeDays) {
        return [
            `Current stock: ${Math.round(currentStock)} units`, `Expected demand: ${Math.round(demand)} units`,
            `Expected purchases: ${Math.round(purchaseRate)} units`, `Reorder level: ${Math.round(reorderLevel)} units`,
            `Safety stock: ${Math.round(safetyStock)} units`, `Lead time: ${Math.round(leadTimeDays)} days`
        ];
    }

    _detectRisks(forecastedStock, currentStock, reorderLevel, safetyStock, demand, sufficiency) {
        const risks = [];
        if (sufficiency === DATA_SUFFICIENCY.SUFFICIENT && forecastedStock <= 0) {
            risks.push(ForecastContracts.createRisk({ metric: 'inventory', displayName: 'Inventory', type: 'INVENTORY_SHORTAGE', severity: 'CRITICAL', description: 'Inventory is forecasted to be depleted', trigger: `Stock will be ${Math.abs(Math.round(forecastedStock))} units below zero`, action: 'Place immediate reorder with expedited shipping', impact: Math.abs(forecastedStock) })); // FIXED
        } else if (sufficiency === DATA_SUFFICIENCY.SUFFICIENT && forecastedStock <= safetyStock) {
            risks.push(ForecastContracts.createRisk({ metric: 'inventory', displayName: 'Inventory', type: 'INVENTORY_SHORTAGE', severity: 'HIGH', description: 'Inventory is forecasted to fall below safety stock', trigger: `Stock will be ${Math.round(forecastedStock)} units (below safety stock of ${Math.round(safetyStock)})`, action: 'Place reorder immediately', impact: safetyStock - forecastedStock })); // FIXED
        } else if (sufficiency === DATA_SUFFICIENCY.SUFFICIENT && forecastedStock <= reorderLevel) {
            risks.push(ForecastContracts.createRisk({ metric: 'inventory', displayName: 'Inventory', type: 'INVENTORY_SHORTAGE', severity: 'MEDIUM', description: 'Inventory is forecasted to fall below reorder level', trigger: `Stock will be ${Math.round(forecastedStock)} units (reorder level: ${Math.round(reorderLevel)})`, action: 'Place reorder soon to avoid stockout', impact: reorderLevel - forecastedStock })); // FIXED
        }
        if (demand > 0 && currentStock > 0) {
            const daysOfStock = (currentStock / demand) * 30;
            if (daysOfStock < 7) {
                risks.push(ForecastContracts.createRisk({ metric: 'inventory', displayName: 'Inventory', type: 'INVENTORY_SHORTAGE', severity: 'HIGH', description: 'Less than 7 days of inventory remaining', trigger: `Stock covers ${Math.round(daysOfStock)} days at current demand`, action: 'Review demand and place reorder', impact: null })); // FIXED
            }
        }
        return risks;
    }

    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
}

module.exports = InventoryForecastCalculator;