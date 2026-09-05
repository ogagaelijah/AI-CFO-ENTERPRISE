// frontend/src/services/reportMappers/cashFlowReportMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapCashFlowReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyCashFlowReport();
  }

  const {
    period = {},
    operatingActivities = {},
    investingActivities = {},
    financingActivities = {},
    openingCash = 0,
    closingCash = 0,
    netChangeInCash = 0,
  } = backendData;

  return {
    period: {
      startDate: period.startDate || period.start || today(),
      endDate: period.endDate || period.end || today(),
    },
    operatingActivities: {
      cashIn: {
        fromCustomers: toNumber(operatingActivities.cashIn?.fromCustomers),
        fromDebtors: toNumber(operatingActivities.cashIn?.fromDebtors),
        fromOtherIncome: toNumber(operatingActivities.cashIn?.fromOtherIncome),
      },
      cashOut: {
        toSuppliers: toNumber(operatingActivities.cashOut?.toSuppliers),
        toCreditors: toNumber(operatingActivities.cashOut?.toCreditors),
        operatingExpenses: toNumber(operatingActivities.cashOut?.operatingExpenses),
      },
      netOperatingCash: toNumber(operatingActivities.netOperatingCash),
    },
    investingActivities: {
      purchaseOfEquipment: toNumber(investingActivities.purchaseOfEquipment),
      netInvestingCash: toNumber(investingActivities.netInvestingCash),
    },
    financingActivities: {
      loansReceived: toNumber(financingActivities.loansReceived),
      ownerContributions: toNumber(financingActivities.ownerContributions),
      netFinancingCash: toNumber(financingActivities.netFinancingCash),
    },
    openingCash: toNumber(openingCash),
    closingCash: toNumber(closingCash),
    netChangeInCash: toNumber(netChangeInCash),
  };
};

const getEmptyCashFlowReport = () => ({
  period: { startDate: today(), endDate: today() },
  operatingActivities: {
    cashIn: {
      fromCustomers: 0,
      fromDebtors: 0,
      fromOtherIncome: 0,
    },
    cashOut: {
      toSuppliers: 0,
      toCreditors: 0,
      operatingExpenses: 0,
    },
    netOperatingCash: 0,
  },
  investingActivities: {
    purchaseOfEquipment: 0,
    netInvestingCash: 0,
  },
  financingActivities: {
    loansReceived: 0,
    ownerContributions: 0,
    netFinancingCash: 0,
  },
  openingCash: 0,
  closingCash: 0,
  netChangeInCash: 0,
});