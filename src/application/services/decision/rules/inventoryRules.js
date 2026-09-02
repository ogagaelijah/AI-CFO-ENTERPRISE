'use strict';

/**
 * Inventory Decision Rules
 * Path: src/application/services/decision/rules/inventoryRules.js
 * SSOT: DecisionContracts
 * @version 1.1.2-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
} = require('../contracts/DecisionContracts');

const NGN = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── pure helpers ────────────────────────────────────────────
const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const isValidNumber = (val) =>
  typeof val === 'number' && Number.isFinite(val);

const pct = (ratio) => (ratio * 100).toFixed(1);

const safeData = (data) => (data && typeof data === 'object' ? data : {});

// ─── rules ───────────────────────────────────────────────────
const inventoryRules = Object.freeze([
  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'LOW_STOCK',
    type: DECISION_TYPES.LOW_STOCK,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Low Stock Alert',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 80,
    defaultTitle: 'Stock Running Low',
    defaultSummary: 'Inventory has fallen below reorder level.',
    defaultRecommendation:
      'Consider replenishing inventory before stock reaches zero.',
    requiredFields: Object.freeze(['currentStock', 'reorderLevel', 'itemName']),

    async evaluate(data) {
      data = safeData(data); // FIX 1: null guard
      const currentStock = toNumber(data.currentStock);
      const reorderLevel = toNumber(data.reorderLevel);
      const weeklySales = toNumber(data.weeklySales, 0);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (!isValidNumber(currentStock) || !isValidNumber(reorderLevel) || !data.itemName) {
        return Object.freeze({ triggered: false, reason: 'Missing required fields' });
      }

      if (currentStock <= reorderLevel) {
        const daysOfStock =
          weeklySales > 0 ? (currentStock / weeklySales) * 7 : 0;
        const urgency =
          daysOfStock < 3
            ? DECISION_TIMEFRAME.IMMEDIATE
            : DECISION_TIMEFRAME.SHORT_TERM;
        const severity =
          daysOfStock < 3
            ? DECISION_SEVERITY.CRITICAL
            : DECISION_SEVERITY.WARNING;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({
            currentStock,
            reorderLevel,
            itemName,
            itemId,
            weeklySales,
            daysOfStock: Math.round(daysOfStock),
            quantityToOrder: Math.max(
              0,
              reorderLevel - currentStock + weeklySales
            ),
          }),
          impact: Object.freeze({
            financialImpact: null,
            description: `Possible stock-out of ${itemName} within ${Math.round(
              daysOfStock
            )} days`,
          }),
          urgency,
          currentState: Object.freeze({ currentStock, reorderLevel }),
          expectedImpact: 'Avoid stock-out and lost sales',
          risks: Object.freeze([
            'Lost revenue',
            'Customer dissatisfaction',
            'Missed sales opportunities',
          ]),
          relatedEntity: DECISION_ENTITY.PRODUCT,
          relatedEntityId: itemId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const quantity =
        evidence.quantityToOrder ||
        Math.max(0, evidence.reorderLevel - evidence.currentStock);
      return `Order ${Math.ceil(quantity)} units of ${
        evidence.itemName
      } to restore stock to reorder level and cover ${
        evidence.weeklySales || 0
      } weekly sales.`;
    },

    alternatives: Object.freeze([
      'Find alternative supplier for faster delivery',
      'Consider safety stock increase if demand is volatile',
    ]),
    assumptions: Object.freeze([
      'Current sales velocity will continue',
      'Lead time is normal',
    ]),
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'STOCK_OUT_RISK',
    type: DECISION_TYPES.STOCK_OUT_RISK,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Stock-Out Risk',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 85,
    defaultTitle: '🚨 CRITICAL: Stock-Out Imminent',
    defaultSummary:
      'Inventory will run out within 3 days at current sales rate.',
    defaultRecommendation: 'Expedite replenishment immediately.',
    requiredFields: Object.freeze(['currentStock', 'dailySales', 'itemName']),

    async evaluate(data) {
      data = safeData(data);
      const currentStock = toNumber(data.currentStock);
      const dailySales = toNumber(data.dailySales);
      const leadTime = toNumber(data.leadTime, 5);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (dailySales > 0) {
        const daysRemaining = currentStock / dailySales;
        if (daysRemaining < 3) {
          const shortageDays = Math.max(0, leadTime - daysRemaining);
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.CRITICAL,
            evidence: Object.freeze({
              currentStock,
              dailySales,
              itemName,
              daysRemaining: Math.round(daysRemaining),
              leadTime,
              shortageDays: Math.round(shortageDays),
              isCritical: daysRemaining < 1,
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `Stock will run out in ${Math.round(
                daysRemaining
              )} days`,
            }),
            urgency: DECISION_TIMEFRAME.IMMEDIATE,
            currentState: Object.freeze({ currentStock, daysRemaining }),
            expectedImpact: 'Avoid stock-out and lost sales',
            risks: Object.freeze([
              'Lost revenue',
              'Customer dissatisfaction',
              'Missed sales opportunities',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: itemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `🚨 CRITICAL: ${evidence.itemName} will run out in ${evidence.daysRemaining} days. Expedite replenishment immediately. Consider emergency order.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'EXCESS_INVENTORY',
    type: DECISION_TYPES.EXCESS_INVENTORY,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Excess Inventory',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 70,
    defaultTitle: 'Excess Inventory Detected',
    defaultSummary: 'Stock levels significantly exceed demand.',
    defaultRecommendation:
      'Review purchasing volume or consider promotional strategy.',
    requiredFields: Object.freeze(['currentStock', 'weeklySales', 'itemName']),

    async evaluate(data) {
      data = safeData(data);
      const currentStock = toNumber(data.currentStock);
      const weeklySales = toNumber(data.weeklySales);
      const unitCost = toNumber(data.unitCost, 0);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (weeklySales > 0) {
        const weeksOfStock = currentStock / weeklySales;
        if (weeksOfStock > 12) {
          const excessUnits = currentStock - weeklySales * 12;
          const excessValue = excessUnits * unitCost;
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              currentStock,
              weeklySales,
              itemName,
              weeksOfStock: Math.round(weeksOfStock),
              excessUnits: Math.round(excessUnits),
              excessValue,
              holdingCost: data.holdingCost || 'unknown',
            }),
            impact: Object.freeze({
              financialImpact: excessValue,
              description: `${Math.round(weeksOfStock)} weeks of inventory`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ currentStock, weeksOfStock }),
            expectedImpact:
              'Reduced inventory holding costs and improved cash flow',
            risks: Object.freeze([
              'Obsolescence',
              'Storage costs',
              'Capital tied up',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: itemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `You have ${evidence.weeksOfStock} weeks of ${evidence.itemName} inventory (${evidence.excessUnits} excess units).`;
      if (evidence.excessValue > 0) {
        recommendation += ` Capital tied up: ${NGN.format(
          evidence.excessValue
        )}.`;
      }
      return (
        recommendation +
        ' Consider a promotion or reducing future purchase orders.'
      );
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'SLOW_MOVING_INVENTORY',
    type: DECISION_TYPES.SLOW_MOVING_INVENTORY,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Slow-Moving Inventory',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Slow-Moving Inventory Identified',
    defaultSummary: 'Inventory has not been sold for over 45 days.',
    defaultRecommendation:
      'Review whether inventory should be discounted or discontinued.',
    requiredFields: Object.freeze([
      'currentStock',
      'daysSinceLastSale',
      'itemName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentStock = toNumber(data.currentStock);
      const daysSinceLastSale = toNumber(data.daysSinceLastSale);
      const unitCost = toNumber(data.unitCost, 0);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (daysSinceLastSale > 45 && currentStock > 0) {
        const value = currentStock * unitCost;
        const severity =
          daysSinceLastSale > 90
            ? DECISION_SEVERITY.WARNING
            : DECISION_SEVERITY.INFO;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({
            currentStock,
            daysSinceLastSale,
            itemName,
            value,
            severityLevel: daysSinceLastSale > 90 ? 'high' : 'moderate',
          }),
          impact: Object.freeze({
            financialImpact: value,
            description: `No sales for ${daysSinceLastSale} days`,
          }),
          urgency:
            daysSinceLastSale > 90
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ currentStock, daysSinceLastSale }),
          expectedImpact: 'Improved inventory turnover and cash flow',
          risks: Object.freeze(['Obsolescence', 'Waste', 'Storage costs']),
          relatedEntity: DECISION_ENTITY.PRODUCT,
          relatedEntityId: itemId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const valueStr = NGN.format(evidence.value);
      if (evidence.daysSinceLastSale > 90) {
        return `${evidence.itemName} has not sold for ${evidence.daysSinceLastSale} days (${evidence.currentStock} units, ${valueStr}). Consider discontinuing or clearance sale.`;
      }
      return `${evidence.itemName} has not sold for ${evidence.daysSinceLastSale} days (${evidence.currentStock} units, ${valueStr}). Consider a promotion.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'HIGH_VALUE_INVENTORY_RISK',
    type: DECISION_TYPES.HIGH_VALUE_INVENTORY_RISK,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'High-Value Inventory Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'High-Value Inventory Risk',
    defaultSummary:
      'A significant portion of assets is tied up in inventory.',
    defaultRecommendation:
      'Review inventory levels and reduce high-value stock.',
    requiredFields: Object.freeze(['inventoryValue', 'totalAssets']),

    async evaluate(data) {
      data = safeData(data);
      const inventoryValue = toNumber(data.inventoryValue);
      const totalAssets = toNumber(data.totalAssets);
      const inventoryTurnover = toNumber(data.inventoryTurnover, 0);
      const industryAverage = toNumber(data.industryAverage, 4);

      if (totalAssets > 0) {
        const inventoryToAssets = inventoryValue / totalAssets;
        if (inventoryToAssets > 0.4) {
          const belowAverageTurnover =
            inventoryTurnover < industryAverage * 0.7;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              inventoryValue,
              totalAssets,
              inventoryToAssets: pct(inventoryToAssets),
              inventoryTurnover,
              industryAverage,
              belowAverageTurnover,
            }),
            impact: Object.freeze({
              financialImpact: inventoryValue,
              description: `${pct(inventoryToAssets)}% of assets in inventory`,
            }),
            urgency: belowAverageTurnover
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ inventoryValue, inventoryToAssets }),
            expectedImpact:
              'Reduced working capital and improved liquidity',
            risks: Object.freeze([
              'Capital tied up',
              'Obsolescence risk',
              'Storage costs',
            ]),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'unknown',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `${evidence.inventoryToAssets}% of your assets (${NGN.format(
        evidence.inventoryValue
      )}) are tied up in inventory.`;
      if (evidence.belowAverageTurnover) {
        recommendation += ` Turnover (${evidence.inventoryTurnover}x) is below industry average (${evidence.industryAverage}x). Reduce inventory to improve liquidity.`;
      }
      return recommendation;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'DETERIORATING_INVENTORY',
    type: DECISION_TYPES.DETERIORATING_INVENTORY,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Deteriorating Inventory Turnover',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Inventory Turnover Declining',
    defaultSummary:
      'Inventory turnover has been decreasing over recent periods.',
    defaultRecommendation:
      'Review purchasing decisions and sales velocity.',
    requiredFields: Object.freeze(['turnoverHistory', 'currentTurnover']),

    async evaluate(data) {
      data = safeData(data);
      const turnoverHistory = Array.isArray(data.turnoverHistory)
        ? data.turnoverHistory
        : [];
      const periods = Math.max(3, toNumber(data.periods, 3));

      if (turnoverHistory.length < periods) {
        return Object.freeze({ triggered: false });
      }

      const lastN = turnoverHistory
        .slice(-periods)
        .map((t) => toNumber(t?.value));

      const isDeclining = lastN.every(
        (val, i) => i === 0 || val < lastN[i - 1]
      );

      if (isDeclining) {
        const firstValue = lastN[0];
        const lastValue = lastN[lastN.length - 1];
        const declinePercent =
          firstValue > 0
            ? ((firstValue - lastValue) / firstValue) * 100
            : 0;

        if (declinePercent > 15) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              periods,
              firstTurnover: firstValue,
              currentTurnover: lastValue,
              declinePercent: declinePercent.toFixed(1),
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `Turnover declined ${declinePercent.toFixed(
                1
              )}% over ${periods} periods`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({
              currentTurnover: lastValue,
              declinePercent,
            }),
            expectedImpact: 'Improved inventory turnover',
            risks: Object.freeze([
              'Excess inventory',
              'Capital tied up',
              'Obsolescence',
            ]),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'unknown',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Inventory turnover declined ${evidence.declinePercent}% over ${evidence.periods} periods. Review purchasing and reduce order quantities for slow-moving items.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'INVENTORY_CONCENTRATION',
    type: DECISION_TYPES.INVENTORY_CONCENTRATION,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Inventory Concentration',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Inventory Concentration Risk',
    defaultSummary:
      'A single item represents a significant portion of inventory value.',
    defaultRecommendation:
      'Monitor concentration and consider safety stock strategy.',
    requiredFields: Object.freeze(['topItemValue', 'totalInventoryValue']),

    async evaluate(data) {
      data = safeData(data);
      const topItemValue = toNumber(data.topItemValue);
      const totalInventoryValue = toNumber(data.totalInventoryValue);
      const threshold = toNumber(data.threshold, 0.4);
      const topItemName = data.topItemName || 'Item';
      const topItemId = data.topItemId || 'unknown';

      if (totalInventoryValue > 0 && topItemValue > 0) {
        const concentration = topItemValue / totalInventoryValue;
        if (concentration > threshold) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              topItemName,
              topItemValue,
              totalInventoryValue,
              concentration: pct(concentration),
              threshold: pct(threshold),
            }),
            impact: Object.freeze({
              financialImpact: topItemValue,
              description: `${pct(
                concentration
              )}% of inventory value in ${topItemName}`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ concentration, topItemValue }),
            expectedImpact: 'Reduced inventory risk',
            risks: Object.freeze([
              'Supplier dependency',
              'Demand fluctuation risk',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: topItemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.concentration}% of your inventory value (${NGN.format(
        evidence.topItemValue
      )}) is in ${evidence.topItemName}. Consider diversifying or securing backup suppliers.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'SEASONAL_STOCK_READINESS',
    type: DECISION_TYPES.SEASONAL_STOCK_READINESS,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Seasonal Stock Readiness',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Seasonal Stock Alert',
    defaultSummary: 'Inventory may be insufficient for upcoming season.',
    defaultRecommendation:
      'Review seasonal inventory requirements and order accordingly.',
    requiredFields: Object.freeze([
      'currentStock',
      'seasonalDemandForecast',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentStock = toNumber(data.currentStock);
      const seasonalDemandForecast = toNumber(data.seasonalDemandForecast);
      const itemName = data.itemName || 'Seasonal item';
      const itemId = data.itemId || 'unknown';

      if (seasonalDemandForecast > 0) {
        const coverage = currentStock / seasonalDemandForecast;
        if (coverage < 0.8) {
          const shortfall = Math.max(
            0,
            seasonalDemandForecast - currentStock
          );
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              currentStock,
              seasonalDemandForecast,
              coverage: pct(coverage),
              shortfall,
              itemName,
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `Only ${pct(
                coverage
              )}% of forecasted seasonal demand covered`,
            }),
            urgency: DECISION_TIMEFRAME.SHORT_TERM,
            currentState: Object.freeze({
              currentStock,
              seasonalDemandForecast,
            }),
            expectedImpact: 'Capitalize on seasonal demand',
            risks: Object.freeze([
              'Lost sales',
              'Missed seasonal opportunity',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: itemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Seasonal demand forecast is ${evidence.seasonalDemandForecast} units but only ${evidence.currentStock} available (${evidence.coverage}% coverage). Order ${Math.ceil(
        evidence.shortfall
      )} units to meet demand.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'INVENTORY_SHRINKAGE',
    type: DECISION_TYPES.INVENTORY_SHRINKAGE,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Inventory Shrinkage Detected',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Inventory Shrinkage Detected',
    defaultSummary:
      'Significant variance between expected and actual stock levels.',
    defaultRecommendation:
      'Investigate root cause of shrinkage and implement controls.',
    requiredFields: Object.freeze([
      'expectedStock',
      'actualStock',
      'itemName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const expectedStock = toNumber(data.expectedStock);
      const actualStock = toNumber(data.actualStock);
      const unitCost = toNumber(data.unitCost, 0);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (expectedStock > 0) {
        const variance = expectedStock - actualStock;
        const variancePercent = (variance / expectedStock) * 100;

        if (Math.abs(variancePercent) > 5) {
          const isShrinkage = variance > 0;
          const value = Math.abs(variance) * unitCost;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              expectedStock,
              actualStock,
              variance: Math.abs(variance),
              variancePercent: variancePercent.toFixed(1),
              itemName,
              isShrinkage,
              value,
            }),
            impact: Object.freeze({
              financialImpact: value,
              description: `${
                isShrinkage ? 'Shrinkage' : 'Surplus'
              } of ${Math.abs(variancePercent).toFixed(1)}%`,
            }),
            urgency:
              Math.abs(variancePercent) > 10
                ? DECISION_TIMEFRAME.SHORT_TERM
                : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ expectedStock, actualStock }),
            expectedImpact: 'Accurate inventory records',
            risks: Object.freeze([
              'Financial loss',
              'Stock-out risk',
              'Theft/error investigation needed',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: itemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const valueStr = NGN.format(evidence.value);
      if (evidence.isShrinkage) {
        return `${evidence.itemName}: Expected ${evidence.expectedStock} but found ${evidence.actualStock} (${evidence.variancePercent}% variance, ${evidence.variance} units, ${valueStr}). Investigate and implement controls.`;
      }
      return `${evidence.itemName}: Found ${evidence.actualStock} but expected ${evidence.expectedStock} (${evidence.variancePercent}% variance). Review receiving records.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'REPLENISHMENT_OPPORTUNITY',
    type: DECISION_TYPES.REPLENISHMENT_OPPORTUNITY,
    category: DECISION_CATEGORIES.INVENTORY,
    name: 'Replenishment Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 70,
    defaultTitle: 'Replenishment Opportunity',
    defaultSummary: 'Fast-moving item is approaching reorder level.',
    defaultRecommendation:
      'Order before stock runs out to avoid lost sales.',
    requiredFields: Object.freeze([
      'currentStock',
      'dailySales',
      'reorderLevel',
      'itemName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentStock = toNumber(data.currentStock);
      const dailySales = toNumber(data.dailySales);
      const reorderLevel = toNumber(data.reorderLevel);
      const leadTime = toNumber(data.leadTime, 5);
      const itemName = data.itemName || 'Item';
      const itemId = data.itemId || 'unknown';

      if (dailySales > 0 && reorderLevel > 0) {
        const daysToReorder = (currentStock - reorderLevel) / dailySales;
        const leadTimeRisk = daysToReorder < leadTime;

        if (daysToReorder < 7 && daysToReorder > 0) {
          const orderQuantity =
            dailySales * (leadTime + 7) - currentStock;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.OPPORTUNITY,
            evidence: Object.freeze({
              currentStock,
              dailySales,
              reorderLevel,
              itemName,
              daysToReorder: Math.round(daysToReorder),
              leadTime,
              leadTimeRisk,
              orderQuantity: Math.max(0, Math.ceil(orderQuantity)),
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `Will reach reorder level in ${Math.round(
                daysToReorder
              )} days`,
            }),
            urgency: leadTimeRisk
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ currentStock, daysToReorder }),
            expectedImpact: 'Avoid stock-out and maximize sales',
            risks: Object.freeze(['Stock-out', 'Lost revenue']),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: itemId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `${evidence.itemName} will reach reorder level in ${evidence.daysToReorder} days. `;
      if (evidence.leadTimeRisk) {
        recommendation += `Order ${evidence.orderQuantity} units immediately to avoid stock-out.`;
      } else {
        recommendation += `Order ${evidence.orderQuantity} units to maintain stock through lead time.`;
      }
      return recommendation;
    },
  }),
]);

module.exports = inventoryRules;