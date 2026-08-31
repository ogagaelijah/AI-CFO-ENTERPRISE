// src/application/services/analytics/ratios/LiquidityRatioCalculator.js

const { AnalyticsContracts } = require('../contracts');

/**
 * Liquidity Ratio Calculator - Investor Grade Production Configuration
 * 
 * Computes business short-term debt coverage solvency indices:
 * - Current Ratio: Standard liquidity cushion (Current Assets / Current Liabilities)
 * - Quick Ratio: Acid-Test tracking (Excludes slow-moving inventory assets)
 * 
 * Performance Profile: Stateless, O(1) Memory Extraction, Zero duplicate query loops.
 * Compliant with IFRS standards for data isolation.
 */
class LiquidityRatioCalculator {
    constructor() {
        // Dependencies removed from constructor since data flows via unified shared payloads
    }

    /**
     * Calculate liquidity ratios using memory-cached shared payloads
     */
    async calculate(sharedPayload) {
        if (!sharedPayload || !sharedPayload.balanceSheetData) {
            throw new Error('LiquidityRatioCalculator: Missing required unified sharedPayload parameters');
        }

        const { balanceSheetData } = sharedPayload;

        // 1. STRICT DATA INTEGRITY - Nulls preserved for validation logs
        const cash = balanceSheetData.cash ?? null;
        const receivables = balanceSheetData.receivables ?? null;
        const payables = balanceSheetData.payables ?? null;
        const inventory = balanceSheetData.inventory ?? null;

        let currentRatio = null;
        let quickRatio = null;

        // ✅ PRODUCTION FIX: Run math only if all components exist. Otherwise, pass nulls safely through factories
        if (cash !== null && receivables !== null && payables !== null && inventory !== null) {
            const currentAssets = cash + receivables + inventory;
            const currentLiabilities = payables;

            currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
            
            const quickAssets = currentAssets - inventory;
            quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : null;
        }

        // 3. HISTORICAL TRAILING TREND MINING (For Investor Reviews)
        const prevCash = balanceSheetData.previous?.cash ?? null;
        const prevReceivables = balanceSheetData.previous?.receivables ?? null;
        const prevPayables = balanceSheetData.previous?.payables ?? null;
        const prevInventory = balanceSheetData.previous?.inventory ?? null;

        let previousRatio = null;
        let previousQuickRatio = null;

        const hasAllPrevious = prevCash !== null && prevReceivables !== null && prevPayables !== null && prevInventory !== null;
        
        if (hasAllPrevious) {
            const prevAssets = prevCash + prevReceivables + prevInventory;
            previousRatio = prevPayables > 0 ? prevAssets / prevPayables : null;
            previousQuickRatio = prevPayables > 0 ? (prevAssets - prevInventory) / prevPayables : null;
        }

        // 4. ✅ CLEAN RATIO CONTRACT PAYLOAD INVOCATIONS - Always return structured records
        return {
            currentRatio: AnalyticsContracts.createRatio({
                name: 'current_ratio',
                displayName: 'Current Ratio',
                value: currentRatio,
                previousValue: previousRatio,
                category: 'liquidity',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'Current Assets / Current Liabilities'
            }),
            quickRatio: AnalyticsContracts.createRatio({
                name: 'quick_ratio',
                displayName: 'Quick Ratio',
                value: quickRatio,
                previousValue: previousQuickRatio,
                category: 'liquidity',
                interpretation: 'HIGHER_IS_BETTER',
                formula: '(Current Assets - Inventory) / Current Liabilities'
            })
        };
    }
}

module.exports = LiquidityRatioCalculator;
