'use strict';

const inventoryRules = require('../../../../src/application/services/decision/rules/inventoryRules');

describe('Inventory Rules', () => {
  // ─── Happy-path tests ───────────────────────────────────────

  describe('LOW_STOCK', () => {
    const rule = inventoryRules.find((r) => r.id === 'LOW_STOCK');

    it('should trigger when stock is at or below reorder level', async () => {
      const result = await rule.evaluate({
        currentStock: 5,
        reorderLevel: 10,
        itemName: 'Product A',
        itemId: 'prod_1',
        weeklySales: 8,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.quantityToOrder).toBeGreaterThan(0);
      expect(result.urgency).toBe('SHORT_TERM');
    });

    it('should trigger CRITICAL when days of stock is less than 3', async () => {
      const result = await rule.evaluate({
        currentStock: 2,
        reorderLevel: 10,
        itemName: 'Product B',
        itemId: 'prod_2',
        weeklySales: 10,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysOfStock).toBe(1);
      expect(result.urgency).toBe('IMMEDIATE');
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger when stock is above reorder level', async () => {
      const result = await rule.evaluate({
        currentStock: 20,
        reorderLevel: 10,
        itemName: 'Product C',
        weeklySales: 8,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('STOCK_OUT_RISK', () => {
    const rule = inventoryRules.find((r) => r.id === 'STOCK_OUT_RISK');

    it('should trigger when stock will run out in less than 3 days', async () => {
      const result = await rule.evaluate({
        currentStock: 10,
        dailySales: 5,
        itemName: 'Product A',
        leadTime: 5,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysRemaining).toBe(2);
      expect(result.evidence.shortageDays).toBe(3);
      expect(result.urgency).toBe('IMMEDIATE');
    });

    it('should mark isCritical when stock will run out in less than 1 day', async () => {
      const result = await rule.evaluate({
        currentStock: 3,
        dailySales: 5,
        itemName: 'Product B',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isCritical).toBe(true);
    });

    it('should not trigger when stock is sufficient', async () => {
      const result = await rule.evaluate({
        currentStock: 50,
        dailySales: 5,
        itemName: 'Product C',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('EXCESS_INVENTORY', () => {
    const rule = inventoryRules.find((r) => r.id === 'EXCESS_INVENTORY');

    it('should trigger when stock exceeds 12 weeks of sales', async () => {
      const result = await rule.evaluate({
        currentStock: 200,
        weeklySales: 10,
        itemName: 'Product A',
        unitCost: 1000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.weeksOfStock).toBe(20);
      expect(result.evidence.excessUnits).toBe(80);
      expect(result.evidence.excessValue).toBe(80000);
    });

    it('should not trigger when stock is at reasonable level', async () => {
      const result = await rule.evaluate({
        currentStock: 60,
        weeklySales: 10,
        itemName: 'Product B',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SLOW_MOVING_INVENTORY', () => {
    const rule = inventoryRules.find((r) => r.id === 'SLOW_MOVING_INVENTORY');

    it('should trigger when item has not sold for over 45 days', async () => {
      const result = await rule.evaluate({
        currentStock: 50,
        daysSinceLastSale: 60,
        itemName: 'Product A',
        unitCost: 5000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.value).toBe(250000);
      expect(result.urgency).toBe('MEDIUM_TERM');
      expect(result.evidence.severityLevel).toBe('moderate');
    });

    it('should escalate when item has not sold for over 90 days', async () => {
      const result = await rule.evaluate({
        currentStock: 30,
        daysSinceLastSale: 100,
        itemName: 'Product B',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.severityLevel).toBe('high');
      expect(result.urgency).toBe('SHORT_TERM');
      expect(result.severity).toBe('WARNING');
    });

    it('should not trigger when item is selling', async () => {
      const result = await rule.evaluate({
        currentStock: 50,
        daysSinceLastSale: 10,
        itemName: 'Product C',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('HIGH_VALUE_INVENTORY_RISK', () => {
    const rule = inventoryRules.find((r) => r.id === 'HIGH_VALUE_INVENTORY_RISK');

    it('should trigger when inventory exceeds 40% of assets', async () => {
      const result = await rule.evaluate({
        inventoryValue: 5000000,
        totalAssets: 10000000,
        inventoryTurnover: 2, // FIX: was 3. Now 2 < 4*0.7 so belowAverageTurnover = true
        industryAverage: 4,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.inventoryToAssets).toBe('50.0');
      expect(result.evidence.belowAverageTurnover).toBe(true);
    });

    it('should not trigger when inventory is reasonable', async () => {
      const result = await rule.evaluate({
        inventoryValue: 2000000,
        totalAssets: 10000000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('DETERIORATING_INVENTORY', () => {
    const rule = inventoryRules.find((r) => r.id === 'DETERIORATING_INVENTORY');

    it('should trigger when turnover is declining', async () => {
      const result = await rule.evaluate({
        turnoverHistory: [{ value: 5 }, { value: 4 }, { value: 3 }],
        currentTurnover: 3,
        periods: 3,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.declinePercent).toBe('40.0');
    });

    it('should not trigger when turnover is stable', async () => {
      const result = await rule.evaluate({
        turnoverHistory: [{ value: 4 }, { value: 4 }, { value: 4 }],
        currentTurnover: 4,
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('INVENTORY_CONCENTRATION', () => {
    const rule = inventoryRules.find((r) => r.id === 'INVENTORY_CONCENTRATION');

    it('should trigger when single item exceeds 40% of inventory value', async () => {
      const result = await rule.evaluate({
        topItemValue: 5000000,
        totalInventoryValue: 10000000,
        topItemName: 'Product A',
        threshold: 0.4,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('50.0');
    });

    it('should not trigger when concentration is below threshold', async () => {
      const result = await rule.evaluate({
        topItemValue: 2000000,
        totalInventoryValue: 10000000,
        topItemName: 'Product A',
        threshold: 0.4,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SEASONAL_STOCK_READINESS', () => {
    const rule = inventoryRules.find((r) => r.id === 'SEASONAL_STOCK_READINESS');

    it('should trigger when stock covers less than 80% of seasonal demand', async () => {
      const result = await rule.evaluate({
        currentStock: 500,
        seasonalDemandForecast: 1000,
        itemName: 'Product A',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.coverage).toBe('50.0');
      expect(result.evidence.shortfall).toBe(500);
    });

    it('should not trigger when stock is sufficient', async () => {
      const result = await rule.evaluate({
        currentStock: 900,
        seasonalDemandForecast: 1000,
        itemName: 'Product A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('INVENTORY_SHRINKAGE', () => {
    const rule = inventoryRules.find((r) => r.id === 'INVENTORY_SHRINKAGE');

    it('should trigger when variance exceeds 5%', async () => {
      const result = await rule.evaluate({
        expectedStock: 100,
        actualStock: 90,
        itemName: 'Product A',
        unitCost: 1000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.variancePercent).toBe('10.0');
      expect(result.evidence.isShrinkage).toBe(true);
      expect(result.evidence.value).toBe(10000);
    });

    it('should trigger for surplus as well', async () => {
      const result = await rule.evaluate({
        expectedStock: 100,
        actualStock: 110,
        itemName: 'Product A',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isShrinkage).toBe(false);
    });

    it('should not trigger when variance is within tolerance', async () => {
      const result = await rule.evaluate({
        expectedStock: 100,
        actualStock: 98,
        itemName: 'Product A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('REPLENISHMENT_OPPORTUNITY', () => {
    const rule = inventoryRules.find((r) => r.id === 'REPLENISHMENT_OPPORTUNITY');

    it('should trigger when stock will reach reorder level within 7 days', async () => {
      const result = await rule.evaluate({
        currentStock: 30,
        dailySales: 5,
        reorderLevel: 10,
        itemName: 'Product A',
        leadTime: 5,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysToReorder).toBe(4);
      expect(result.evidence.leadTimeRisk).toBe(true);
    });

    it('should not trigger when stock is well above reorder level', async () => {
      const result = await rule.evaluate({
        currentStock: 100,
        dailySales: 5,
        reorderLevel: 10,
        itemName: 'Product A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge-case / invalid input coverage ─────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = inventoryRules;

    it('every rule safely returns { triggered: false } for null/undefined/empty', async () => {
      for (const rule of allRules) {
        expect((await rule.evaluate()).triggered).toBe(false);
        expect((await rule.evaluate(null)).triggered).toBe(false);
        expect((await rule.evaluate(undefined)).triggered).toBe(false);
        expect((await rule.evaluate({})).triggered).toBe(false);
      }
    });

    it('every rule tolerates non-object data without throwing', async () => {
      const badInputs = [42, 'string', true, false, [], () => {}];
      for (const rule of allRules) {
        for (const bad of badInputs) {
          await expect(rule.evaluate(bad)).resolves.toEqual(
            expect.objectContaining({ triggered: false })
          );
        }
      }
    });

    it('LOW_STOCK handles zero / negative sales without division errors', async () => {
      const rule = inventoryRules.find((r) => r.id === 'LOW_STOCK');
      const result = await rule.evaluate({
        currentStock: 5,
        reorderLevel: 10,
        weeklySales: 0,
        itemName: 'X',
      });
      expect(result.triggered).toBe(true);
      expect(result.evidence.daysOfStock).toBe(0);
    });

    it('STOCK_OUT_RISK does not trigger when dailySales is zero', async () => {
      const rule = inventoryRules.find((r) => r.id === 'STOCK_OUT_RISK');
      const result = await rule.evaluate({
        currentStock: 10,
        dailySales: 0,
        itemName: 'X',
      });
      expect(result.triggered).toBe(false);
    });

    it('EXCESS_INVENTORY does not trigger when weeklySales is zero', async () => {
      const rule = inventoryRules.find((r) => r.id === 'EXCESS_INVENTORY');
      const result = await rule.evaluate({
        currentStock: 1000,
        weeklySales: 0,
        itemName: 'X',
      });
      expect(result.triggered).toBe(false);
    });

    it('DETERIORATING_INVENTORY returns false for non-array history', async () => {
      const rule = inventoryRules.find((r) => r.id === 'DETERIORATING_INVENTORY');
      const result = await rule.evaluate({
        turnoverHistory: 'not-an-array',
        periods: 3,
      });
      expect(result.triggered).toBe(false);
    });

    it('INVENTORY_CONCENTRATION returns false when totalInventoryValue is zero', async () => {
      const rule = inventoryRules.find((r) => r.id === 'INVENTORY_CONCENTRATION');
      const result = await rule.evaluate({
        topItemValue: 5000,
        totalInventoryValue: 0,
      });
      expect(result.triggered).toBe(false);
    });

    it('SEASONAL_STOCK_READINESS returns false when forecast is zero', async () => {
      const rule = inventoryRules.find((r) => r.id === 'SEASONAL_STOCK_READINESS');
      const result = await rule.evaluate({
        currentStock: 100,
        seasonalDemandForecast: 0,
      });
      expect(result.triggered).toBe(false);
    });

    it('INVENTORY_SHRINKAGE returns false when expectedStock is zero', async () => {
      const rule = inventoryRules.find((r) => r.id === 'INVENTORY_SHRINKAGE');
      const result = await rule.evaluate({
        expectedStock: 0,
        actualStock: 10,
        itemName: 'X',
      });
      expect(result.triggered).toBe(false);
    });

    it('generateRecommendation returns default when evidence is null/undefined', () => {
      for (const rule of allRules) {
        if (typeof rule.generateRecommendation === 'function') {
          expect(rule.generateRecommendation(null)).toBe(
            rule.defaultRecommendation
          );
          expect(rule.generateRecommendation(undefined)).toBe(
            rule.defaultRecommendation
          );
        }
      }
    });
  });
});