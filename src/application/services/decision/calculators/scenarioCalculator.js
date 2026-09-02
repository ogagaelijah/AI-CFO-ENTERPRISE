'use strict';

/**
 * Scenario Calculator
 * Path: src/application/services/decision/calculators/scenarioCalculator.js
 * Runs what-if scenarios to compare different business decisions.
 * @version 2.2.0-prod
 */

const ImpactCalculator = require('./impactCalculator');

// ─── pure helpers ────────────────────────────────────────────
const safeNumber = (val, def = 0) => {
  const n = Number(val);
  return Number.isFinite(n)? n : def;
};

const safeObj = (v) =>
  v && typeof v === 'object' &&!Array.isArray(v)? v : {};

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

class ScenarioCalculator {
  constructor(options = {}) {
    this.impactCalculator =
      options.impactCalculator || new ImpactCalculator();
  }

  /**
   * Run a single scenario
   */
  runScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      type,
      currentState = {},
      proposedChange = {},
      businessContext = {},
    } = p;

    // Warn in dev if unknown type
    if (process.env.NODE_ENV!== 'production' && type) {
      const validTypes = [
        'PRICE_CHANGE',
        'COST_SAVING',
        'REVENUE_GROWTH',
        'VOLUME_CHANGE',
        'EXPENSE_REDUCTION',
        'WORKING_CAPITAL',
      ];
      if (!validTypes.includes(type)) {
        console.warn(`[ScenarioCalculator] Unknown type: ${type}. Will fallback to GENERIC.`);
      }
    }

    const impact = this.impactCalculator.calculate({
      type,
      currentState: safeObj(currentState),
      proposedChange: safeObj(proposedChange),
      businessContext: safeObj(businessContext),
    });

    return Object.freeze({
      name: name || 'Unnamed Scenario',
      type: type || impact?.type || 'GENERIC',
      impact,
      metrics: this.extractMetrics(impact),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Run multiple scenarios and compare
   */
  runScenarios(params = {}) {
    const p = safeObj(params);
    const {
      scenarios = [],
      businessContext = {},
      comparisonMetric = 'profitImpact',
    } = p;

    const list = Array.isArray(scenarios)? scenarios : [];
    const results = list.map((scenario) => {
      const s = safeObj(scenario);
      return this.runScenario({
        name: s.name,
        type: s.type,
        currentState: s.currentState,
        proposedChange: s.proposedChange,
        businessContext,
      });
    });

    const ranked = this.rankScenarios(results, comparisonMetric);
    const currency = safeObj(businessContext).currency || 'NGN';

    return Object.freeze({
      type: 'SCENARIO_COMPARISON',
      currency,
      scenarios: Object.freeze(results),
      ranked: Object.freeze(ranked),
      comparisonMetric,
      bestScenario: ranked.length > 0? ranked[0] : null,
      worstScenario:
        ranked.length > 0? ranked[ranked.length - 1] : null,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Extract key metrics from impact result
   * confidence is kept as-is (enum string or number from ImpactCalculator)
   */
  extractMetrics(impact = {}) {
    const i = safeObj(impact);
    return Object.freeze({
      revenueImpact: safeNumber(i.revenueImpact),
      profitImpact: safeNumber(i.profitImpact),
      marginChange: safeNumber(i.marginChange),
      roi: i.roi!= null? safeNumber(i.roi) : null,
      annualSaving: safeNumber(i.annualSaving),
      totalCashFreed: safeNumber(i.totalCashFreed),
      confidence: i.confidence?? null,
    });
  }

  /**
   * Rank scenarios by a metric (descending)
   * null values sort last
   */
  rankScenarios(results, metric) {
    const list = Array.isArray(results)? results : [];
    const sorted = [...list].sort((a, b) => {
      const aValue = this.getMetricValue(a, metric);
      const bValue = this.getMetricValue(b, metric);
      return bValue - aValue;
    });

    return sorted.map((result, index) =>
      Object.freeze({
       ...result,
        rank: index + 1,
      })
    );
  }

  getMetricValue(result, metric) {
    const metrics = this.extractMetrics(safeObj(result).impact);
    const value = metrics[metric];
    // null sorts last, numbers sort normally
    if (value === null || value === undefined) return -Infinity;
    return typeof value === 'number' && Number.isFinite(value)
     ? value
      : 0;
  }

  // ─── convenience scenario runners ──────────────────────────

  runPriceScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentPrice,
      currentVolume,
      currentMargin,
      priceChangePercent,
      businessContext = {},
    } = p;

    const pct = safeNumber(priceChangePercent);
    return this.runScenario({
      name:
        name ||
        `Price ${pct > 0? 'Increase' : 'Decrease'} of ${Math.abs(
          pct * 100
        ).toFixed(0)}%`,
      type: 'PRICE_CHANGE',
      currentState: { currentPrice, currentVolume, currentMargin },
      proposedChange: { priceChangePercent: pct },
      businessContext,
    });
  }

  runCostSavingScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentCost,
      annualVolume,
      currentMargin,
      currentRevenue,
      savingPercent,
      businessContext = {},
    } = p;

    const sp = safeNumber(savingPercent);
    return this.runScenario({
      name: name || `Cost Reduction of ${(sp * 100).toFixed(0)}%`,
      type: 'COST_SAVING',
      currentState: {
        currentCost,
        annualVolume,
        currentMargin,
        currentRevenue,
      },
      proposedChange: { savingPercent: sp },
      businessContext,
    });
  }

  runRevenueGrowthScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentRevenue,
      currentMargin,
      targetGrowth,
      investment,
      businessContext = {},
    } = p;

    const growth = safeNumber(targetGrowth);
    return this.runScenario({
      name:
        name || `Revenue Growth of ${(growth * 100).toFixed(0)}%`,
      type: 'REVENUE_GROWTH',
      currentState: {
        currentRevenue,
        currentMargin,
        growthRate: growth,
      },
      proposedChange: {
        targetGrowth: growth,
        investment: safeNumber(investment),
      },
      businessContext,
    });
  }

  runVolumeScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentVolume,
      currentPrice,
      currentCost,
      currentMargin,
      volumeChangePercent,
      businessContext = {},
    } = p;

    const vcp = safeNumber(volumeChangePercent);
    return this.runScenario({
      name:
        name ||
        `Volume ${vcp > 0? 'Increase' : 'Decrease'} of ${Math.abs(
          vcp * 100
        ).toFixed(0)}%`,
      type: 'VOLUME_CHANGE',
      currentState: {
        currentVolume,
        currentPrice,
        currentCost,
        currentMargin,
      },
      proposedChange: { volumeChangePercent: vcp },
      businessContext,
    });
  }

  runExpenseReductionScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentExpense,
      annualRevenue,
      currentNetMargin,
      reductionPercent,
      businessContext = {},
    } = p;

    const rp = safeNumber(reductionPercent);
    return this.runScenario({
      name:
        name || `Expense Reduction of ${(rp * 100).toFixed(0)}%`,
      type: 'EXPENSE_REDUCTION',
      currentState: {
        currentExpense,
        annualRevenue,
        currentNetMargin,
      },
      proposedChange: { reductionPercent: rp },
      businessContext,
    });
  }

  runWorkingCapitalScenario(params = {}) {
    const p = safeObj(params);
    const {
      name,
      currentAR,
      currentAP,
      currentInventory,
      dailySales,
      dailyPurchases,
      arReductionDays,
      apExtensionDays,
      inventoryReductionDays,
      businessContext = {},
    } = p;

    return this.runScenario({
      name: name || 'Working Capital Optimization',
      type: 'WORKING_CAPITAL',
      currentState: {
        currentAR,
        currentAP,
        currentInventory,
        dailySales,
        dailyPurchases,
      },
      proposedChange: {
        arReductionDays: safeNumber(arReductionDays),
        apExtensionDays: safeNumber(apExtensionDays),
        inventoryReductionDays: safeNumber(inventoryReductionDays),
      },
      businessContext,
    });
  }

  /**
   * Comprehensive business scenario pack
   */
  runBusinessScenarios(params = {}) {
    const p = safeObj(params);
    const {
      businessData = {},
      scenarios = ['price', 'cost', 'revenue', 'volume', 'expense'],
      businessContext = {},
    } = p;

    const data = safeObj(businessData);
    const scenarioList = Array.isArray(scenarios)? scenarios : [];
    const results = {};
    const allResults = [];
    const currency = safeObj(businessContext).currency || 'NGN';

    if (scenarioList.includes('price')) {
      [
        { change: 0.05, label: '5% Increase' },
        { change: 0.1, label: '10% Increase' },
        { change: -0.05, label: '5% Decrease' },
      ].forEach((scenario) => {
        const result = this.runPriceScenario({
          name: `Price ${scenario.label}`,
          currentPrice: safeNumber(data.currentPrice),
          currentVolume: safeNumber(data.currentVolume),
          currentMargin: safeNumber(data.currentMargin),
          priceChangePercent: scenario.change,
          businessContext,
        });
        results[`price_${scenario.change}`] = result;
        allResults.push(result);
      });
    }

    if (scenarioList.includes('cost')) {
      [
        { percent: 0.05, label: '5% Cost Reduction' },
        { percent: 0.1, label: '10% Cost Reduction' },
        { percent: 0.15, label: '15% Cost Reduction' },
      ].forEach((scenario) => {
        const result = this.runCostSavingScenario({
          name: scenario.label,
          currentCost: safeNumber(data.currentCost),
          annualVolume: safeNumber(data.annualVolume),
          currentMargin: safeNumber(data.currentMargin),
          currentRevenue: safeNumber(data.currentRevenue),
          savingPercent: scenario.percent,
          businessContext,
        });
        results[`cost_${scenario.percent}`] = result;
        allResults.push(result);
      });
    }

    if (scenarioList.includes('revenue')) {
      [
        { growth: 0.1, label: '10% Revenue Growth' },
        { growth: 0.2, label: '20% Revenue Growth' },
        { growth: 0.3, label: '30% Revenue Growth' },
      ].forEach((scenario) => {
        const result = this.runRevenueGrowthScenario({
          name: scenario.label,
          currentRevenue: safeNumber(data.currentRevenue),
          currentMargin: safeNumber(data.currentMargin),
          targetGrowth: scenario.growth,
          investment: safeNumber(data.investment),
          businessContext,
        });
        results[`revenue_${scenario.growth}`] = result;
        allResults.push(result);
      });
    }

    if (scenarioList.includes('volume')) {
      [
        { change: 0.1, label: '10% Volume Increase' },
        { change: 0.2, label: '20% Volume Increase' },
        { change: -0.1, label: '10% Volume Decrease' },
      ].forEach((scenario) => {
        const result = this.runVolumeScenario({
          name: `Volume ${scenario.label}`,
          currentVolume: safeNumber(data.currentVolume),
          currentPrice: safeNumber(data.currentPrice),
          currentCost: safeNumber(data.currentCost),
          currentMargin: safeNumber(data.currentMargin),
          volumeChangePercent: scenario.change,
          businessContext,
        });
        results[`volume_${scenario.change}`] = result;
        allResults.push(result);
      });
    }

    if (scenarioList.includes('expense')) {
      [
        { percent: 0.05, label: '5% Expense Reduction' },
        { percent: 0.1, label: '10% Expense Reduction' },
        { percent: 0.15, label: '15% Expense Reduction' },
      ].forEach((scenario) => {
        const result = this.runExpenseReductionScenario({
          name: scenario.label,
          currentExpense: safeNumber(data.currentExpense),
          annualRevenue: safeNumber(data.currentRevenue),
          currentNetMargin: safeNumber(data.currentNetMargin, 0.1),
          reductionPercent: scenario.percent,
          businessContext,
        });
        results[`expense_${scenario.percent}`] = result;
        allResults.push(result);
      });
    }

    const ranked = this.rankScenarios(allResults, 'profitImpact');

    return Object.freeze({
      type: 'BUSINESS_SCENARIOS',
      currency,
      scenarios: Object.freeze(results),
      allResults: Object.freeze(allResults),
      ranked: Object.freeze(ranked),
      bestScenario: ranked.length > 0? ranked[0] : null,
      summary: this.generateScenarioSummary(ranked, currency),
      generatedAt: new Date().toISOString(),
    });
  }

  generateScenarioSummary(ranked, currency) {
    const list = Array.isArray(ranked)? ranked : [];
    if (list.length === 0) {
      return Object.freeze({
        total: 0,
        best: null,
        worst: null,
        insights: Object.freeze(['No scenarios available']),
      });
    }

    const best = list[0];
    const worst = list[list.length - 1];
    const insights = [];

    insights.push(
      `Best scenario: ${best.name} with profit impact of ${formatCurrency(
        best.metrics?.profitImpact,
        currency
      )}`
    );
    insights.push(
      `Worst scenario: ${worst.name} with profit impact of ${formatCurrency(
        worst.metrics?.profitImpact,
        currency
      )}`
    );

    if (safeNumber(best.metrics?.profitImpact) > 0) {
      insights.push(
        `Consider implementing the ${best.name} scenario to maximize profitability`
      );
    } else {
      insights.push(
        'All scenarios show negative profit impact. Review assumptions and consider alternative strategies.'
      );
    }

    return Object.freeze({
      total: list.length,
      best,
      worst,
      insights: Object.freeze(insights),
    });
  }

  compareScenarios(scenario1, scenario2) {
    const s1 = safeObj(scenario1);
    const s2 = safeObj(scenario2);
    const metrics1 = this.extractMetrics(s1.impact);
    const metrics2 = this.extractMetrics(s2.impact);
    const currency =
      s1.impact?.currency || s2.impact?.currency || 'NGN';
    const diff = metrics1.profitImpact - metrics2.profitImpact;

    return Object.freeze({
      type: 'SCENARIO_COMPARISON',
      currency,
      scenario1: Object.freeze({ name: s1.name, metrics: metrics1 }),
      scenario2: Object.freeze({ name: s2.name, metrics: metrics2 }),
      differences: Object.freeze({
        revenueImpact:
          metrics1.revenueImpact - metrics2.revenueImpact,
        profitImpact: diff,
        marginChange: metrics1.marginChange - metrics2.marginChange,
      }),
      betterScenario:
        diff > 0? s1.name : diff < 0? s2.name : 'TIE',
      recommendation: this.generateComparisonRecommendation(
        s1,
        s2,
        metrics1,
        metrics2,
        currency
      ),
    });
  }

  generateComparisonRecommendation(
    scenario1,
    scenario2,
    metrics1,
    metrics2,
    currency
  ) {
    const diff = Math.abs(
      metrics1.profitImpact - metrics2.profitImpact
    );

    if (metrics1.profitImpact > metrics2.profitImpact) {
      return `${scenario1.name} is better than ${
        scenario2.name
      } by ${formatCurrency(
        diff,
        currency
      )} in profit impact. Consider prioritizing ${String(
        scenario1.name
      ).toLowerCase()}.`;
    }
    if (metrics2.profitImpact > metrics1.profitImpact) {
      return `${scenario2.name} is better than ${
        scenario1.name
      } by ${formatCurrency(
        diff,
        currency
      )} in profit impact. Consider prioritizing ${String(
        scenario2.name
      ).toLowerCase()}.`;
    }
    return 'Both scenarios have similar profit impact. Consider other factors like implementation effort and risk.';
  }

  formatForDisplay(scenarioResult = {}) {
    const s = safeObj(scenarioResult);
    const impact = safeObj(s.impact);

    return Object.freeze({
      name: s.name,
      type: s.type,
      timestamp: s.timestamp,
      impact: Object.freeze({
        summary: impact.recommendation,
        revenue: safeNumber(impact.revenueImpact),
        profit: safeNumber(impact.profitImpact),
        margin: safeNumber(impact.marginChange),
        confidence: impact.confidence?? null,
      }),
      metrics: this.extractMetrics(impact),
    });
  }
}

module.exports = ScenarioCalculator;