// src/application/services/forecast/core/index.js

const RevenueForecastCalculator = require('./RevenueForecastCalculator');
const SalesVolumeForecastCalculator = require('./SalesVolumeForecastCalculator');
const COGSForecastCalculator = require('./COGSForecastCalculator');

module.exports = {
    RevenueForecastCalculator,
    SalesVolumeForecastCalculator,
    COGSForecastCalculator,
};