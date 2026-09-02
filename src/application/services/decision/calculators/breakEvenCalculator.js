'use strict';

/**
 * Break-Even Calculator
 * Path: src/application/services/decision/calculators/breakEvenCalculator.js
 * Calculates break-even points, contribution margins, and profitability thresholds.
 * @version 2.1.0-prod
 */

// ─── pure helpers ────────────────────────────────────────────
const safeNumber = (val, def = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
};

const safeObj = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

// Cache Intl.NumberFormat instances per currency for performance
const formatterCache = new Map();

const formatCurrency = (value, currency = 'NGN') => {
  const num = safeNumber(value);
  try {
    if (!formatterCache.has(currency)) {
      formatterCache.set(
        currency,
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        })
      );
    }
    return formatterCache.get(currency).format(num);
  } catch {
    return `NGN ${num.toLocaleString('en-NG', {
      maximumFractionDigits: 0,
    })}`;
  }
};

class BreakEvenCalculator {
  /**
   * Calculate break-even point
   */
  calculateBreakEven(params = {}) {
    const p = safeObj(params);
    const fixedCosts = safeNumber(p.fixedCosts);
    const variableCostPerUnit = safeNumber(p.variableCostPerUnit);
    const sellingPricePerUnit = safeNumber(p.sellingPricePerUnit);
    const currentVolume = safeNumber(p.currentVolume);
    const currency = p.currency || 'NGN';

    const contributionMargin =
      sellingPricePerUnit - variableCostPerUnit;
    const hasPositiveContribution = contributionMargin > 0;

    const breakEvenUnitsRaw = hasPositiveContribution
      ? fixedCosts / contributionMargin
      : Infinity;
    const breakEvenUnits = Number.isFinite(breakEvenUnitsRaw)
      ? Math.ceil(breakEvenUnitsRaw)
      : Infinity;

    const breakEvenRevenue = Number.isFinite(breakEvenUnitsRaw)
      ? breakEvenUnitsRaw * sellingPricePerUnit
      : Infinity;

    const currentRevenue = currentVolume * sellingPricePerUnit;
    const currentVariableCosts =
      currentVolume * variableCostPerUnit;
    const currentProfit =
      currentRevenue - currentVariableCosts - fixedCosts;

    const marginOfSafety =
      currentVolume > 0 && Number.isFinite(breakEvenUnitsRaw)
        ? ((currentVolume - breakEvenUnitsRaw) / currentVolume) * 100
        : 0;

    const marginOfSafetyRevenue =
      currentRevenue > 0 && Number.isFinite(breakEvenRevenue)
        ? ((currentRevenue - breakEvenRevenue) / currentRevenue) * 100
        : 0;

    const contributionMarginRatio =
      sellingPricePerUnit > 0
        ? contributionMargin / sellingPricePerUnit
        : 0;

    return Object.freeze({
      type: 'BREAK_EVEN',
      currency,
      inputs: Object.freeze({
        fixedCosts,
        variableCostPerUnit,
        sellingPricePerUnit,
        currentVolume,
      }),
      outputs: Object.freeze({
        breakEvenUnits,
        breakEvenRevenue,
        contributionMargin,
        contributionMarginRatio,
        currentVolume,
        currentRevenue,
        currentProfit,
        marginOfSafety: Math.max(0, marginOfSafety),
        marginOfSafetyRevenue: Math.max(0, marginOfSafetyRevenue),
        isProfitable: currentProfit > 0,
        profitGap: currentProfit < 0 ? Math.abs(currentProfit) : 0,
      }),
      recommendation: this.generateBreakEvenRecommendation({
        breakEvenUnits: breakEvenUnitsRaw,
        currentVolume,
        currentProfit,
        marginOfSafety,
        currency,
      }),
    });
  }

  /**
   * Units needed to achieve target profit
   */
  calculateTargetProfit(params = {}) {
    const p = safeObj(params);
    const fixedCosts = safeNumber(p.fixedCosts);
    const variableCostPerUnit = safeNumber(p.variableCostPerUnit);
    const sellingPricePerUnit = safeNumber(p.sellingPricePerUnit);
    const targetProfit = safeNumber(p.targetProfit);
    const currency = p.currency || 'NGN';

    const contributionMargin =
      sellingPricePerUnit - variableCostPerUnit;

    if (contributionMargin <= 0) {
      return Object.freeze({
        type: 'TARGET_PROFIT',
        currency,
        unitsNeeded: Infinity,
        revenueNeeded: Infinity,
        contributionMargin,
        targetProfit,
        message:
          'Cannot achieve target profit with negative or zero contribution margin. Review pricing or variable costs.',
        feasible: false,
      });
    }

    const unitsNeededRaw =
      (fixedCosts + targetProfit) / contributionMargin;
    const unitsNeeded = Math.ceil(unitsNeededRaw);
    const revenueNeeded = unitsNeededRaw * sellingPricePerUnit;

    return Object.freeze({
      type: 'TARGET_PROFIT',
      currency,
      inputs: Object.freeze({
        fixedCosts,
        variableCostPerUnit,
        sellingPricePerUnit,
        targetProfit,
      }),
      outputs: Object.freeze({
        unitsNeeded,
        revenueNeeded,
        contributionMargin,
        targetProfit,
      }),
      message: `Need to sell ${unitsNeeded.toLocaleString()} units (${formatCurrency(
        revenueNeeded,
        currency
      )}) to achieve target profit of ${formatCurrency(
        targetProfit,
        currency
      )}`,
      feasible: true,
    });
  }

  /**
   * Contribution margin analysis
   */
  calculateContributionMargin(params = {}) {
    const p = safeObj(params);
    const sellingPricePerUnit = safeNumber(p.sellingPricePerUnit);
    const variableCostPerUnit = safeNumber(p.variableCostPerUnit);
    const fixedCosts = safeNumber(p.fixedCosts);
    const currentVolume = safeNumber(p.currentVolume);
    const currency = p.currency || 'NGN';

    const contributionMargin =
      sellingPricePerUnit - variableCostPerUnit;
    const contributionMarginRatio =
      sellingPricePerUnit > 0
        ? contributionMargin / sellingPricePerUnit
        : 0;
    const totalContribution = currentVolume * contributionMargin;
    const currentProfit = totalContribution - fixedCosts;
    const breakEvenUnitsRaw =
      contributionMargin > 0
        ? fixedCosts / contributionMargin
        : Infinity;

    return Object.freeze({
      type: 'CONTRIBUTION_MARGIN',
      currency,
      inputs: Object.freeze({
        sellingPricePerUnit,
        variableCostPerUnit,
        fixedCosts,
        currentVolume,
      }),
      outputs: Object.freeze({
        contributionMargin,
        contributionMarginRatio: contributionMarginRatio * 100,
        totalContribution,
        fixedCosts,
        currentVolume,
        currentProfit,
        breakEvenUnits: Number.isFinite(breakEvenUnitsRaw)
          ? Math.ceil(breakEvenUnitsRaw)
          : Infinity,
      }),
      recommendation: this.generateContributionMarginRecommendation({
        contributionMarginRatio: contributionMarginRatio * 100,
        totalContribution,
        fixedCosts,
        currentProfit,
        currency,
      }),
    });
  }

  /**
   * Multi-scenario break-even analysis
   */
  calculateBreakEvenScenarios(params = {}) {
    const p = safeObj(params);
    const fixedCosts = safeNumber(p.fixedCosts);
    const variableCostPerUnit = safeNumber(p.variableCostPerUnit);
    const sellingPricePerUnit = safeNumber(p.sellingPricePerUnit);
    const currentVolume = safeNumber(p.currentVolume);
    const priceScenarios = Array.isArray(p.priceScenarios)
      ? p.priceScenarios
      : [];
    const volumeScenarios = Array.isArray(p.volumeScenarios)
      ? p.volumeScenarios
      : [];
    const currency = p.currency || 'NGN';

    const scenarios = [];
    const baseCM = sellingPricePerUnit - variableCostPerUnit;

    scenarios.push(
      Object.freeze({
        name: 'Base Scenario',
        fixedCosts,
        variableCostPerUnit,
        sellingPricePerUnit,
        breakEvenUnits:
          baseCM > 0 ? Math.ceil(fixedCosts / baseCM) : Infinity,
        contributionMargin: baseCM,
        contributionMarginRatio:
          sellingPricePerUnit > 0
            ? baseCM / sellingPricePerUnit
            : 0,
        volume: currentVolume,
        profit:
          currentVolume > 0
            ? currentVolume * baseCM - fixedCosts
            : undefined,
      })
    );

    priceScenarios.forEach((priceChange) => {
      const pc = safeNumber(priceChange);
      const newPrice = sellingPricePerUnit * (1 + pc);
      const contributionMargin = newPrice - variableCostPerUnit;
      scenarios.push(
        Object.freeze({
          name: `${pc > 0 ? '+' : ''}${(pc * 100).toFixed(0)}% Price`,
          fixedCosts,
          variableCostPerUnit,
          sellingPricePerUnit: newPrice,
          breakEvenUnits:
            contributionMargin > 0
              ? Math.ceil(fixedCosts / contributionMargin)
              : Infinity,
          contributionMargin,
          contributionMarginRatio:
            newPrice > 0 ? contributionMargin / newPrice : 0,
          volume: currentVolume,
          profit:
            currentVolume > 0
              ? currentVolume * contributionMargin - fixedCosts
              : undefined,
        })
      );
    });

    volumeScenarios.forEach((volumeChange) => {
      const vc = safeNumber(volumeChange);
      const newVolume = currentVolume * (1 + vc);
      const profit = newVolume * baseCM - fixedCosts;
      scenarios.push(
        Object.freeze({
          name: `${vc > 0 ? '+' : ''}${(vc * 100).toFixed(
            0
          )}% Volume`,
          fixedCosts,
          variableCostPerUnit,
          sellingPricePerUnit,
          breakEvenUnits:
            baseCM > 0 ? Math.ceil(fixedCosts / baseCM) : Infinity,
          contributionMargin: baseCM,
          contributionMarginRatio:
            sellingPricePerUnit > 0
              ? baseCM / sellingPricePerUnit
              : 0,
          volume: newVolume,
          profit,
        })
      );
    });

    const profitableScenarios = scenarios.filter(
      (s) => s.profit !== undefined
    );
    const bestScenario =
      profitableScenarios.length > 0
        ? profitableScenarios.reduce((best, current) =>
            current.profit > best.profit ? current : best
          )
        : null;

    return Object.freeze({
      type: 'SCENARIO_ANALYSIS',
      currency,
      scenarios: Object.freeze(scenarios),
      bestScenario,
      recommendation: this.generateScenarioRecommendation(
        scenarios,
        currency
      ),
    });
  }

  // ─── recommendation generators ─────────────────────────────

  generateBreakEvenRecommendation(data) {
    const {
      breakEvenUnits,
      currentVolume,
      currentProfit,
      marginOfSafety,
    } = data;

    if (!Number.isFinite(breakEvenUnits)) {
      return 'Cannot reach break-even with current pricing. Review pricing and cost structure immediately.';
    }

    if (currentProfit < 0) {
      const unitsNeeded = Math.max(
        0,
        Math.ceil(breakEvenUnits - currentVolume)
      );
      return `Currently losing money. Need to sell ${Math.ceil(
        breakEvenUnits
      ).toLocaleString()} units to break even (${unitsNeeded.toLocaleString()} more units needed). Consider reducing costs or increasing prices.`;
    }

    if (marginOfSafety < 20) {
      return `Operating with ${marginOfSafety.toFixed(
        1
      )}% margin of safety. Consider reducing costs or increasing prices to improve safety margin.`;
    }

    if (marginOfSafety > 50) {
      return `Strong margin of safety at ${marginOfSafety.toFixed(
        1
      )}%. Consider expansion opportunities or reinvestment.`;
    }

    return `Break-even at ${Math.ceil(
      breakEvenUnits
    ).toLocaleString()} units. Current volume: ${currentVolume.toLocaleString()} units. Margin of safety: ${marginOfSafety.toFixed(
      1
    )}%.`;
  }

  generateContributionMarginRecommendation(data) {
    const {
      contributionMarginRatio,
      totalContribution,
      fixedCosts,
      currentProfit,
      currency,
    } = data;

    if (contributionMarginRatio < 30) {
      return `Contribution margin ratio (${contributionMarginRatio.toFixed(
        1
      )}%) is low. Review pricing and variable costs.`;
    }

    if (totalContribution < fixedCosts) {
      return `Total contribution (${formatCurrency(
        totalContribution,
        currency
      )}) is below fixed costs (${formatCurrency(
        fixedCosts,
        currency
      )}). Need to increase volume or improve margins.`;
    }

    if (currentProfit > 0) {
      return `Healthy contribution margin (${contributionMarginRatio.toFixed(
        1
      )}%) with positive profit (${formatCurrency(
        currentProfit,
        currency
      )}). Consider scaling up.`;
    }

    return `Contribution margin ratio: ${contributionMarginRatio.toFixed(
      1
    )}%. Review cost structure and pricing.`;
  }

  generateScenarioRecommendation(scenarios, currency) {
    const profitable = scenarios.filter(
      (s) => s.profit !== undefined && s.profit > 0
    );

    if (profitable.length === 0) {
      return 'All scenarios show negative or low profitability. Review cost structure and pricing strategy.';
    }

    const best = profitable.reduce((b, c) =>
      c.profit > b.profit ? c : b
    );

    return `Best scenario: ${best.name} with profit of ${formatCurrency(
      best.profit,
      currency
    )}. Consider implementing this strategy.`;
  }

  /**
   * Format for display / API response
   */
  formatForDisplay(result = {}) {
    const outputs = result.outputs || {};
    return Object.freeze({
      type: result.type,
      currency: result.currency,
      summary: result.recommendation || result.message,
      metrics: Object.freeze({
        breakEvenUnits: outputs.breakEvenUnits ?? null,
        breakEvenRevenue: outputs.breakEvenRevenue ?? null,
        contributionMargin: outputs.contributionMargin ?? null,
        contributionMarginRatio:
          outputs.contributionMarginRatio ?? null,
        currentProfit: outputs.currentProfit ?? null,
        marginOfSafety: outputs.marginOfSafety ?? null,
        isProfitable: outputs.isProfitable ?? null,
      }),
      requiresReview:
        (outputs.profitGap ?? 0) > 0 ||
        outputs.breakEvenUnits === Infinity,
    });
  }
}

module.exports = BreakEvenCalculator;