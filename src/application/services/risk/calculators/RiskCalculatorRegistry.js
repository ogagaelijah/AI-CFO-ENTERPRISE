// src/application/services/risk/calculators/RiskCalculatorRegistry.js
'use strict';

const { RISK_TYPES } = require('../contracts');

/**
 * RiskCalculatorRegistry
 * - Auto-registers all calculators
 * - Provides a single entry point for the Risk Engine
 * - Supports parallel execution, selective runs, and graceful degradation
 * Version: 1.0.0
 */
class RiskCalculatorRegistry {
  constructor({
    logger = console,
    // Optional dependency injection for analyzers / repos
    trendAnalyzer = null,
    volatilityAnalyzer = null,
    // Optional domain repositories
    debtorRepository = null,
    creditorRepository = null,
    inventoryRepository = null,
  } = {}) {
    this.logger = logger;

    const commonDeps = {
      trendAnalyzer,
      volatilityAnalyzer,
      logger,
    };

    // Lazy require to keep startup fast
    const RevenueRiskCalculator = require('./RevenueRiskCalculator');
    const ReceivablesRiskCalculator = require('./ReceivablesRiskCalculator');
    const ProfitabilityRiskCalculator = require('./ProfitabilityRiskCalculator');
    const PayablesRiskCalculator = require('./PayablesRiskCalculator');
    const InventoryRiskCalculator = require('./InventoryRiskCalculator');
    const CashFlowRiskCalculator = require('./CashFlowRiskCalculator');
    const ExpenseRiskCalculator = require('./ExpenseRiskCalculator');

    this.calculators = new Map([
      [RISK_TYPES.REVENUE, new RevenueRiskCalculator(commonDeps)],
      [RISK_TYPES.RECEIVABLES, new ReceivablesRiskCalculator({
        ...commonDeps,
        debtorRepository,
      })],
      [RISK_TYPES.PROFITABILITY, new ProfitabilityRiskCalculator(commonDeps)],
      [RISK_TYPES.PAYABLES, new PayablesRiskCalculator({
        ...commonDeps,
        creditorRepository,
      })],
      [RISK_TYPES.INVENTORY, new InventoryRiskCalculator({
        ...commonDeps,
        inventoryRepository,
      })],
      [RISK_TYPES.CASH_FLOW, new CashFlowRiskCalculator(commonDeps)],
      [RISK_TYPES.EXPENSE, new ExpenseRiskCalculator(commonDeps)],
    ]);
  }

  /**
   * Get a specific calculator by risk type
   */
  get(type) {
    return this.calculators.get(type) || null;
  }

  /**
   * List all registered risk types
   */
  listTypes() {
    return Array.from(this.calculators.keys());
  }

  /**
   * Run a single calculator
   */
  async calculateOne(type, params = {}) {
    const calculator = this.get(type);
    if (!calculator) {
      throw new Error(`No calculator registered for risk type: ${type}`);
    }
    return calculator.calculate(params);
  }

  /**
   * Run multiple calculators in parallel
   * @param {Object} payload - keyed by RISK_TYPES
   * @param {Object} options
   * @returns {Promise<Object>} { [type]: RiskContract }
   */
  async calculateMany(payload = {}, options = {}) {
    const { parallel = true, types = null } = options;
    const selectedTypes = types || this.listTypes();

    const tasks = selectedTypes
      .filter((type) => this.calculators.has(type) && payload[type])
      .map(async (type) => {
        try {
          const result = await this.calculateOne(type, payload[type]);
          return [type, result];
        } catch (err) {
          this.logger.error?.(`[Registry] ${type} failed`, { error: err.message });
          return [type, null];
        }
      });

    if (parallel) {
      const results = await Promise.all(tasks);
      return Object.fromEntries(results.filter(([, r]) => r !== null));
    }

    // Sequential fallback
    const results = {};
    for (const task of tasks) {
      const [type, result] = await task;
      if (result) results[type] = result;
    }
    return results;
  }

  /**
   * Convenience: run the full risk suite for a business
   * Expects a normalized data bag
   */
  async calculateAll({
    userId,
    businessId,
    data = {},
    previousRisks = {},
  }) {
    const payload = {
      [RISK_TYPES.REVENUE]: {
        userId,
        businessId,
        revenueData: data.revenue || data.revenueData || [],
        previousRisk: previousRisks[RISK_TYPES.REVENUE] || null,
      },
      [RISK_TYPES.RECEIVABLES]: {
        userId,
        businessId,
        receivablesData: data.receivables || data.receivablesData || [],
        agingData: data.receivablesAging || data.agingReceivables || null,
        previousRisk: previousRisks[RISK_TYPES.RECEIVABLES] || null,
      },
      [RISK_TYPES.PROFITABILITY]: {
        userId,
        businessId,
        marginData: data.margins || data.marginData || data.grossMargin || [],
        marginType: data.marginType || 'gross',
        previousRisk: previousRisks[RISK_TYPES.PROFITABILITY] || null,
      },
      [RISK_TYPES.PAYABLES]: {
        userId,
        businessId,
        payablesData: data.payables || data.payablesData || [],
        agingData: data.payablesAging || data.agingPayables || null,
        previousRisk: previousRisks[RISK_TYPES.PAYABLES] || null,
      },
      [RISK_TYPES.INVENTORY]: {
        userId,
        businessId,
        inventoryData: data.inventory || data.inventoryData || [],
        revenueGrowth: data.revenueGrowth || 0,
        lowStockItems: data.lowStockItems || 0,
        inventoryDetails: data.inventoryDetails || null,
        previousRisk: previousRisks[RISK_TYPES.INVENTORY] || null,
      },
      [RISK_TYPES.CASH_FLOW]: {
        userId,
        businessId,
        cashData: data.cash || data.cashData || [],
        burnData: data.burn || data.burnData || [],
        currentCash: data.currentCash,
        averageMonthlyBurn: data.averageMonthlyBurn,
        previousRisk: previousRisks[RISK_TYPES.CASH_FLOW] || null,
      },
      [RISK_TYPES.EXPENSE]: {
        userId,
        businessId,
        expenseData: data.expenses || data.expenseData || [],
        revenueGrowth: data.revenueGrowth || 0,
        previousRisk: previousRisks[RISK_TYPES.EXPENSE] || null,
      },
    };

    return this.calculateMany(payload, { parallel: true });
  }
}

module.exports = RiskCalculatorRegistry;