// src/application/services/forecast/core/index.js

const RevenueForecastCalculator = require('./RevenueForecastCalculator');
const SalesVolumeForecastCalculator = require('./SalesVolumeForecastCalculator');
const COGSForecastCalculator = require('./COGSForecastCalculator');
const ExpenseForecastCalculator = require('./ExpenseForecastCalculator');
const ProfitForecastCalculator = require('./ProfitForecastCalculator');
const CashFlowForecastCalculator = require('./CashFlowForecastCalculator');
const ReceivablesForecastCalculator = require('./ReceivablesForecastCalculator');
const PayablesForecastCalculator = require('./PayablesForecastCalculator');
const InventoryForecastCalculator = require('./InventoryForecastCalculator');
const DemandForecastCalculator = require('./DemandForecastCalculator');

module.exports = {
    RevenueForecastCalculator,
    SalesVolumeForecastCalculator,
    COGSForecastCalculator,
    ExpenseForecastCalculator,
    ProfitForecastCalculator,
    CashFlowForecastCalculator,
    ReceivablesForecastCalculator,
    PayablesForecastCalculator,
    InventoryForecastCalculator,
    DemandForecastCalculator,
};