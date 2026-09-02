'use strict';

/**
 * Impact Calculator
 * Path: src/application/services/decision/calculators/impactCalculator.js
 * @version 1.2.1-prod
 */

// Inlined - no external contracts dependency
const IMPACT_TYPE = Object.freeze({
  PRICE_CHANGE: 'PRICE_CHANGE',
  COST_SAVING: 'COST_SAVING',
  REVENUE_GROWTH: 'REVENUE_GROWTH',
  VOLUME_CHANGE: 'VOLUME_CHANGE',
  EXPENSE_REDUCTION: 'EXPENSE_REDUCTION',
  WORKING_CAPITAL: 'WORKING_CAPITAL',
});

const DECISION_CONFIDENCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

/**
 * @typedef {Object} BusinessContext
 * @property {string} [currency='NGN'] - ISO 4217 currency code
 * @property {number} [periodsPerYear=12] - Periods per year for annualization
 */

// ─── pure helpers ────────────────────────────────────────────
const safeNumber = (val, def = 0) => {
  const n = Number(val);
  return Number.isFinite(n)? n : def;
};

const safeObj = (v) =>
  v && typeof v === 'object' &&!Array.isArray(v)? v : {};

// Cache Intl.NumberFormat instances per currency for performance
const formatterCache = new Map();
const formatCurrency = (value, currency = 'NGN') => {
  const num = safeNumber(value);
  try {
    if (!formatterCache.has(currency)) {
      formatterCache.set(currency, new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }));
    }
    return formatterCache.get(currency).format(num);
  } catch {
    // Circuit breaker fallback if currency code is invalid
    return `NGN ${num.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  }
};

class ImpactCalculator {
  /**
   * @param {object} params
   * @param {string} params.type - IMPACT_TYPE value
   * @param {object} [params.currentState]
   * @param {object} [params.proposedChange]
   * @param {BusinessContext} [params.businessContext]
   */
  calculate(params = {}) {
    const p = safeObj(params);
    const type = p.type;
    const currentState = safeObj(p.currentState);
    const proposedChange = safeObj(p.proposedChange);
    const businessContext = safeObj(p.businessContext);

    const currency = businessContext.currency || 'NGN';
    const periodsPerYear = safeNumber(businessContext.periodsPerYear, 12);
    const ctx = Object.freeze({
   ...businessContext,
      currency,
      periodsPerYear,
    });

    switch (type) {
      case IMPACT_TYPE.PRICE_CHANGE:
        return this.calculatePriceImpact(currentState, proposedChange, ctx);
      case IMPACT_TYPE.COST_SAVING:
        return this.calculateCostSavingImpact(currentState, proposedChange, ctx);
      case IMPACT_TYPE.REVENUE_GROWTH:
        return this.calculateRevenueGrowthImpact(currentState, proposedChange, ctx);
      case IMPACT_TYPE.VOLUME_CHANGE:
        return this.calculateVolumeImpact(currentState, proposedChange, ctx);
      case IMPACT_TYPE.EXPENSE_REDUCTION:
        return this.calculateExpenseReductionImpact(currentState, proposedChange, ctx);
      case IMPACT_TYPE.WORKING_CAPITAL:
        return this.calculateWorkingCapitalImpact(currentState, proposedChange, ctx);
      default:
        return this.calculateGenericImpact(currentState, proposedChange, ctx);
    }
  }

  // ─── impact calculators ────────────────────────────────────
  calculatePriceImpact(currentState, proposedChange, ctx) {
    const cp = safeNumber(currentState.currentPrice);
    const cv = safeNumber(currentState.currentVolume);
    const cm = safeNumber(currentState.currentMargin);
    const pe = safeNumber(
      currentState.priceElasticity!= null? currentState.priceElasticity : 0.5
    );
    const pcp = safeNumber(proposedChange.priceChangePercent);

    const newPrice = cp * (1 + pcp);
    const volumeChangePercent = -(pcp * pe);
    const newVolume = cv * (1 + volumeChangePercent);

    const currentRevenue = cp * cv;
    const newRevenue = newPrice * newVolume;
    const revenueImpact = newRevenue - currentRevenue;

    const currentCostPerUnit = cp * (1 - cm);
    const newCostPerUnit = newPrice * (1 - cm);
    const currentProfit = currentRevenue - currentCostPerUnit * cv;
    const newProfit = newRevenue - newCostPerUnit * newVolume;
    const profitImpact = newProfit - currentProfit;

    const newMargin = newRevenue > 0
   ? (newRevenue - newCostPerUnit * newVolume) / newRevenue
      : 0;

    const confidence = this.calculateConfidence({
      hasPriceData: cp > 0,
      hasVolumeData: cv > 0,
      hasMarginData: cm > 0,
      elasticityKnown: currentState.priceElasticity!= null,
    });

    return Object.freeze({
      type: IMPACT_TYPE.PRICE_CHANGE,
      priceChange: pcp,
      newPrice,
      volumeChange: volumeChangePercent,
      currentRevenue,
      newRevenue,
      revenueImpact,
      currentProfit,
      newProfit,
      profitImpact,
      currentMargin: cm * 100,
      newMargin: newMargin * 100,
      marginChange: (newMargin - cm) * 100,
      recommendation: this.generatePriceImpactRecommendation({
        priceChangePercent: pcp,
        revenueImpact,
        profitImpact,
        newMargin: newMargin * 100,
        currentMargin: cm * 100,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateCostSavingImpact(currentState, proposedChange, ctx) {
    const cc = safeNumber(currentState.currentCost);
    const av = safeNumber(currentState.annualVolume);
    const cm = safeNumber(currentState.currentMargin);
    const cr = safeNumber(currentState.currentRevenue);
    const sp = safeNumber(proposedChange.savingPercent);
    const sa = safeNumber(proposedChange.savingAmount);

    const totalSaving = sa || cc * sp;
    const annualSaving = totalSaving * av;
    const newCost = cc - totalSaving;
    const newMargin = cr > 0? (cr - newCost * av) / cr : 0;

    const confidence = this.calculateConfidence({
      hasCostData: cc > 0,
      hasVolumeData: av > 0,
      hasMarginData: cm > 0,
      savingIsSpecific: sa > 0 || sp > 0,
    });

    return Object.freeze({
      type: IMPACT_TYPE.COST_SAVING,
      savingPerUnit: totalSaving,
      annualVolume: av,
      annualSaving,
      currentCost: cc,
      newCost,
      currentMargin: cm * 100,
      newMargin: newMargin * 100,
      marginImprovement: (newMargin - cm) * 100,
      recommendation: this.generateCostSavingRecommendation({
        annualSaving,
        marginImprovement: (newMargin - cm) * 100,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateRevenueGrowthImpact(currentState, proposedChange, ctx) {
    const cr = safeNumber(currentState.currentRevenue);
    const cm = safeNumber(currentState.currentMargin);
    const growth = safeNumber(
      proposedChange.targetGrowth!= null? proposedChange.targetGrowth : currentState.growthRate
    );
    const inv = safeNumber(proposedChange.investment);

    const newRevenue = cr * (1 + growth);
    const revenueIncrease = newRevenue - cr;
    const currentProfit = cr * cm;
    const newProfit = newRevenue * cm;
    const profitIncrease = newProfit - currentProfit;
    const roi = inv > 0? (profitIncrease / inv) * 100 : null;

    const confidence = this.calculateConfidence({
      hasRevenueData: cr > 0,
      hasMarginData: cm > 0,
      growthIsSpecific: proposedChange.targetGrowth!= null,
      investmentKnown: inv > 0,
    });

    return Object.freeze({
      type: IMPACT_TYPE.REVENUE_GROWTH,
      growthRate: growth * 100,
      currentRevenue: cr,
      newRevenue,
      revenueIncrease,
      currentProfit,
      newProfit,
      profitIncrease,
      investment: inv,
      roi,
      recommendation: this.generateRevenueGrowthRecommendation({
        growth: growth * 100,
        revenueIncrease,
        profitIncrease,
        roi,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateVolumeImpact(currentState, proposedChange, ctx) {
    const cv = safeNumber(currentState.currentVolume);
    const cp = safeNumber(currentState.currentPrice);
    const cc = safeNumber(currentState.currentCost);
    const vcp = safeNumber(proposedChange.volumeChangePercent);

    const newVolume = cv * (1 + vcp);
    const volumeChange = newVolume - cv;
    const currentRevenue = cp * cv;
    const newRevenue = cp * newVolume;
    const revenueImpact = newRevenue - currentRevenue;
    const currentProfit = (cp - cc) * cv;
    const newProfit = (cp - cc) * newVolume;
    const profitImpact = newProfit - currentProfit;

    const confidence = this.calculateConfidence({
      hasVolumeData: cv > 0,
      hasPriceData: cp > 0,
      hasCostData: cc > 0,
      volumeChangeSpecific: vcp!== 0,
    });

    return Object.freeze({
      type: IMPACT_TYPE.VOLUME_CHANGE,
      volumeChangePercent: vcp * 100,
      currentVolume: cv,
      newVolume,
      volumeChange,
      currentRevenue,
      newRevenue,
      revenueImpact,
      currentProfit,
      newProfit,
      profitImpact,
      recommendation: this.generateVolumeImpactRecommendation({
        volumeChangePercent: vcp * 100,
        revenueImpact,
        profitImpact,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateExpenseReductionImpact(currentState, proposedChange, ctx) {
    const ce = safeNumber(currentState.currentExpense);
    const ar = safeNumber(currentState.annualRevenue);
    const cnm = safeNumber(currentState.currentNetMargin);
    const rp = safeNumber(proposedChange.reductionPercent);
    const ra = safeNumber(proposedChange.reductionAmount);

    const reduction = ra || ce * rp;
    const annualSaving = reduction * ctx.periodsPerYear;
    const newNetMargin = ar > 0? (ar * cnm + annualSaving) / ar : 0;

    const confidence = this.calculateConfidence({
      hasExpenseData: ce > 0,
      hasRevenueData: ar > 0,
      reductionIsSpecific: ra > 0 || rp > 0,
    });

    return Object.freeze({
      type: IMPACT_TYPE.EXPENSE_REDUCTION,
      reductionPercent: rp * 100,
      reductionAmount: reduction,
      annualSaving,
      currentNetMargin: cnm * 100,
      newNetMargin: newNetMargin * 100,
      marginImprovement: (newNetMargin - cnm) * 100,
      recommendation: this.generateExpenseReductionRecommendation({
        annualSaving,
        marginImprovement: (newNetMargin - cnm) * 100,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateWorkingCapitalImpact(currentState, proposedChange, ctx) {
    const car = safeNumber(currentState.currentAR);
    const cap = safeNumber(currentState.currentAP);
    const ci = safeNumber(currentState.currentInventory);
    const ds = safeNumber(currentState.dailySales);
    const dp = safeNumber(currentState.dailyPurchases);
    const ard = safeNumber(proposedChange.arReductionDays);
    const aed = safeNumber(proposedChange.apExtensionDays);
    const ird = safeNumber(proposedChange.inventoryReductionDays);

    const arReduction = ard * ds;
    const inventoryReduction = ird * ds;
    const apExtension = aed * dp;
    const totalCashFreed = arReduction + inventoryReduction + apExtension;

    const confidence = this.calculateConfidence({
      hasARDailyData: ds > 0 && car > 0,
      hasAPDailyData: dp > 0 && cap > 0,
      hasInventoryData: ci > 0,
      changesSpecific: ard > 0 || ird > 0 || aed > 0,
    });

    return Object.freeze({
      type: IMPACT_TYPE.WORKING_CAPITAL,
      arReduction,
      inventoryReduction,
      apExtension,
      totalCashFreed,
      currentAR: car,
      currentAP: cap,
      currentInventory: ci,
      recommendation: this.generateWorkingCapitalRecommendation({
        totalCashFreed,
        arReduction,
        inventoryReduction,
        apExtension,
        currency: ctx.currency,
      }),
      confidence,
      confidenceLevel: this.toConfidenceLevel(confidence),
    });
  }

  calculateGenericImpact(currentState, proposedChange, ctx) {
    return Object.freeze({
      type: 'GENERIC',
      currentState,
      proposedChange,
      recommendation: 'Review the proposed change and assess its potential impact.',
      confidence: 50,
      confidenceLevel: DECISION_CONFIDENCE.MEDIUM,
      requiresReview: true,
    });
  }

  // ─── recommendation generators ─────────────────────────────
  generatePriceImpactRecommendation(data) {
    const { priceChangePercent, revenueImpact, profitImpact, newMargin, currentMargin, currency } = data;
    if (priceChangePercent > 0) {
      if (revenueImpact > 0 && profitImpact > 0) {
        return `Price increase of ${(priceChangePercent * 100).toFixed(1)}% would increase revenue by ${formatCurrency(revenueImpact, currency)} and profit by ${formatCurrency(profitImpact, currency)}. New margin: ${newMargin.toFixed(1)}% (was ${currentMargin.toFixed(1)}%).`;
      }
      return `Price increase of ${(priceChangePercent * 100).toFixed(1)}% may reduce volume. Test with a small segment first.`;
    }
    return 'Consider if a price decrease would drive sufficient volume to maintain profitability.';
  }

  generateCostSavingRecommendation(data) {
    return `Annual savings of ${formatCurrency(data.annualSaving, data.currency)} would improve margins by ${data.marginImprovement.toFixed(1)}%. Implement cost reduction measures immediately.`;
  }

  generateRevenueGrowthRecommendation(data) {
    let rec = `Revenue growth of ${data.growth.toFixed(1)}% would generate ${formatCurrency(data.revenueIncrease, data.currency)} in additional revenue.`;
    if (data.profitIncrease > 0) {
      rec += ` Estimated profit increase: ${formatCurrency(data.profitIncrease, data.currency)}.`;
    }
    if (data.roi!= null && data.roi > 0) {
      rec += ` ROI on investment: ${data.roi.toFixed(1)}%.`;
    }
    return rec;
  }

  generateVolumeImpactRecommendation(data) {
    if (data.volumeChangePercent > 0) {
      return `Volume increase of ${data.volumeChangePercent.toFixed(1)}% would increase revenue by ${formatCurrency(data.revenueImpact, data.currency)} and profit by ${formatCurrency(data.profitImpact, data.currency)}. Invest in sales and marketing to achieve this.`;
    }
    return `Volume decline of ${Math.abs(data.volumeChangePercent).toFixed(1)}% would reduce revenue by ${formatCurrency(Math.abs(data.revenueImpact), data.currency)}. Investigate causes and take corrective action.`;
  }

  generateExpenseReductionRecommendation(data) {
    return `Annual expense reduction of ${formatCurrency(data.annualSaving, data.currency)} would improve margins by ${data.marginImprovement.toFixed(1)}%. Review expense categories and implement cost controls.`;
  }

  generateWorkingCapitalRecommendation(data) {
    let rec = `Total cash that can be freed: ${formatCurrency(data.totalCashFreed, data.currency)}. `;
    if (data.arReduction > 0) {
      rec += `AR reduction: ${formatCurrency(data.arReduction, data.currency)}. `;
    }
    if (data.inventoryReduction > 0) {
      rec += `Inventory reduction: ${formatCurrency(data.inventoryReduction, data.currency)}. `;
    }
    if (data.apExtension > 0) {
      rec += `AP extension: ${formatCurrency(data.apExtension, data.currency)}. `;
    }
    return rec + 'Implement working capital optimization initiatives immediately.';
  }

  // ─── confidence ────────────────────────────────────────────
  calculateConfidence(params = {}) {
    const keys = Object.keys(params);
    if (keys.length === 0) return 50;
    const dataPoints = keys.filter((k) => Boolean(params[k])).length;
    const maxPoints = keys.length;
    const score = 50 + (dataPoints / maxPoints) * 30;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  toConfidenceLevel(score) {
    if (score >= 80) return DECISION_CONFIDENCE.HIGH;
    if (score >= 60) return DECISION_CONFIDENCE.MEDIUM;
    return DECISION_CONFIDENCE.LOW;
  }

  // ─── display ───────────────────────────────────────────────
  formatForDisplay(impactResult = {}) {
    return Object.freeze({
      type: impactResult.type,
      summary: impactResult.recommendation,
      metrics: Object.freeze({
        current: Object.freeze({
          revenue: impactResult.currentRevenue?? null,
          profit: impactResult.currentProfit?? null,
          margin: impactResult.currentMargin?? null,
          volume: impactResult.currentVolume?? null,
        }),
        projected: Object.freeze({
          revenue: impactResult.newRevenue?? null,
          profit: impactResult.newProfit?? null,
          margin: impactResult.newMargin?? null,
          volume: impactResult.newVolume?? null,
        }),
        changes: Object.freeze({
          revenue: impactResult.revenueImpact?? null,
          profit: impactResult.profitImpact?? null,
          margin: impactResult.marginChange?? null,
          volume: impactResult.volumeChange?? null,
        }),
      }),
      confidence: impactResult.confidence,
      confidenceLevel: impactResult.confidenceLevel,
      requiresReview: Boolean(impactResult.requiresReview),
    });
  }
}

module.exports = ImpactCalculator;