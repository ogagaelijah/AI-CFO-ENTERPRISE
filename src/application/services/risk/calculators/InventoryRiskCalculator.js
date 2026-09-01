// src/application/services/risk/calculators/InventoryRiskCalculator.js
'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * InventoryRiskCalculator - Production v1.1.0
 * Detects: overstock, stockouts, slow-moving, concentration
 */
class InventoryRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.INVENTORY;

  async calculate({
    userId,
    businessId,
    inventoryData = [],
    revenueGrowth = 0,
    lowStockItems = 0,
    inventoryDetails = null,
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const values = this._extractValues(inventoryData, ['value', 'inventory', 'amount']);
      const metrics = this._calculateMetrics(
        values,
        inventoryData,
        revenueGrowth,
        lowStockItems,
        inventoryDetails
      );
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createInventoryRisk({
        score,
        inventoryValue: metrics.inventoryValue,
        inventoryGrowth: metrics.inventoryGrowth,
        revenueGrowth: metrics.revenueGrowth,
        lowStockItems: metrics.lowStockItems,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          values.length,
          metrics.hasDetails ? 0.10 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        inventoryToRevenueRatio: metrics.inventoryToRevenueRatio,
        inventoryConcentration: metrics.inventoryConcentration,
        slowMovingItems: metrics.slowMovingItems,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        // Rising inventory = WORSENING (when sales are flat)
        risk = this._enrichWithTrend(risk, values, true);
      }

      risk = this._enrichEvidence(risk, this._generateWarnings(metrics));
      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[InventoryRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[InventoryRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.INVENTORY,
        title: 'Inventory Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

  _enrichWithTrend(risk, values, invert = false) {
    if (values.length < this.config.trendMinPoints) return risk;
    const trend = this.trendAnalyzer.analyze(values);
    if (!trend?.available) return risk;

    const direction = this._mapTrendDirection(trend, invert);

    return Object.freeze({
      ...risk,
      trend: Object.freeze({
        ...risk.trend,
        direction,
        slope: trend.slope,
        strength: trend.strength,
      }),
      metrics: Object.freeze({
        ...risk.metrics,
        trendSlope: trend.slope,
        trendStrength: trend.strength,
      }),
    });
  }

  _calculateMetrics(values, data, revenueGrowth, lowStockItems, inventoryDetails) {
    const dataPoints = values.length;
    const inventoryValue = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousInventory = dataPoints > 1 ? values[dataPoints - 2] : 0;

    const inventoryGrowth = previousInventory > 0
      ? ((inventoryValue - previousInventory) / previousInventory) * 100
      : (inventoryValue > 0 ? 100 : 0);

    // Inventory-to-revenue ratio
    const revenueSeries = this._safeArray(data).map((d) =>
      this._safeNumber(d?.revenue ?? d?.sales)
    );
    const avgRevenue =
      revenueSeries.length > 0
        ? revenueSeries.reduce((a, b) => a + b, 0) / revenueSeries.length
        : 1;
    const inventoryToRevenueRatio =
      avgRevenue > 0 ? (inventoryValue / avgRevenue) * 100 : 0;

    // Concentration & slow-moving
    let inventoryConcentration = 0;
    let slowMovingItems = 0;
    let hasDetails = false;

    if (Array.isArray(inventoryDetails) && inventoryDetails.length > 0) {
      hasDetails = true;
      const total = inventoryDetails.reduce(
        (sum, item) => sum + this._safeNumber(item?.value),
        0
      );
      if (total > 0) {
        const maxItem = Math.max(
          ...inventoryDetails.map((item) => this._safeNumber(item?.value))
        );
        inventoryConcentration = (maxItem / total) * 100;
      }
      slowMovingItems = inventoryDetails.filter(
        (item) => this._safeNumber(item?.daysSinceLastSale) > 90
      ).length;
    }

    return {
      inventoryValue,
      previousInventory,
      inventoryGrowth,
      revenueGrowth: this._safeNumber(revenueGrowth),
      inventoryToRevenueRatio,
      inventoryConcentration,
      lowStockItems: this._safeNumber(lowStockItems),
      slowMovingItems,
      hasDetails,
      dataPoints,
    };
  }

  _calculateScore(metrics) {
    let score = 0;

    // 1. Growth vs revenue (30%)
    const growthDiff = metrics.inventoryGrowth - metrics.revenueGrowth;
    if (growthDiff > 20) score += 30;
    else if (growthDiff > 10) score += 20;
    else if (growthDiff > 5) score += 10;

    // 2. Inventory-to-revenue ratio (20%)
    if (metrics.inventoryToRevenueRatio > 60) score += 20;
    else if (metrics.inventoryToRevenueRatio > 40) score += 12;
    else if (metrics.inventoryToRevenueRatio > 25) score += 6;

    // 3. Low stock / stockout risk (20%)
    if (metrics.lowStockItems > 10) score += 20;
    else if (metrics.lowStockItems > 5) score += 12;
    else if (metrics.lowStockItems > 2) score += 6;

    // 4. Concentration + slow-moving (15%)
    if (metrics.inventoryConcentration > 60) score += 10;
    else if (metrics.inventoryConcentration > 40) score += 6;
    if (metrics.slowMovingItems > 5) score += 5;

    // 5. Data quality (15%)
    if (metrics.dataPoints < 3) score += 15;
    else if (metrics.dataPoints < 6) score += 8;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];
    const growthDiff = metrics.inventoryGrowth - metrics.revenueGrowth;

    if (growthDiff > 20) {
      warnings.push(
        `🔴 Inventory grew ${metrics.inventoryGrowth.toFixed(1)}% vs revenue ${metrics.revenueGrowth.toFixed(1)}%`
      );
    } else if (growthDiff > 10) {
      warnings.push(
        `⚠️ Inventory growing faster than revenue: +${growthDiff.toFixed(1)}% gap`
      );
    }

    if (metrics.lowStockItems > 10) {
      warnings.push(
        `🔴 ${metrics.lowStockItems} items below reorder level — stockout risk`
      );
    } else if (metrics.lowStockItems > 5) {
      warnings.push(`⚠️ ${metrics.lowStockItems} items below reorder level`);
    }

    if (metrics.inventoryToRevenueRatio > 60) {
      warnings.push(
        `⚠️ High inventory: ${metrics.inventoryToRevenueRatio.toFixed(1)}% of revenue`
      );
    }

    if (metrics.inventoryConcentration > 60) {
      warnings.push(
        `⚠️ Inventory concentration: ${metrics.inventoryConcentration.toFixed(1)}% in single SKU`
      );
    }

    if (metrics.slowMovingItems > 5) {
      warnings.push(`⚠️ ${metrics.slowMovingItems} slow-moving items detected`);
    }

    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data for reliable inventory assessment');
    }

    return warnings;
  }
}

module.exports = InventoryRiskCalculator;