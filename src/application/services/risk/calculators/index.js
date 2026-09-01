'use strict';

/**
 * Risk Calculators – Public API
 * SSOT v1.2.1
 */

const BaseRiskCalculator = require('./BaseRiskCalculator');
const RevenueRiskCalculator = require('./RevenueRiskCalculator');
const ReceivablesRiskCalculator = require('./ReceivablesRiskCalculator');
const ProfitabilityRiskCalculator = require('./ProfitabilityRiskCalculator');
const PayablesRiskCalculator = require('./PayablesRiskCalculator');
const InventoryRiskCalculator = require('./InventoryRiskCalculator');
const CashFlowRiskCalculator = require('./CashFlowRiskCalculator');
const ExpenseRiskCalculator = require('./ExpenseRiskCalculator');
const RiskCalculatorRegistry = require('./RiskCalculatorRegistry');

module.exports = {
  // Base
  BaseRiskCalculator,

  // Domain calculators
  RevenueRiskCalculator,
  ReceivablesRiskCalculator,
  ProfitabilityRiskCalculator,
  PayablesRiskCalculator,
  InventoryRiskCalculator,
  CashFlowRiskCalculator,
  ExpenseRiskCalculator,

  // Registry / Orchestrator
  RiskCalculatorRegistry,
};