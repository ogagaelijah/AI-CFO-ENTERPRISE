// frontend/src/services/reportMappers/cashFlowMapper.js

import { today, isValidData } from './utils';

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
        fromCustomers: operatingActivities.cashIn?.fromCustomers || 0,
        fromDebtors: operatingActivities.cashIn?.fromDebtors || 0,
        fromOtherIncome: operatingActivities.cashIn?.fromOtherIncome || 0,
      },
      cashOut: {
        toSuppliers: operatingActivities.cashOut?.toSuppliers || 0,
        toCreditors: operatingActivities.cashOut?.toCreditors || 0,
        operatingExpenses: operatingActivities.cashOut?.operatingExpenses || 0,
      },
      netOperatingCash: operatingActivities.netOperatingCash || 0,
    },
    investingActivities: {
      purchaseOfEquipment: investingActivities.purchaseOfEquipment || 0,
      netInvestingCash: investingActivities.netInvestingCash || 0,
    },
    financingActivities: {
      loansReceived: financingActivities.loansReceived || 0,
      ownerContributions: financingActivities.ownerContributions || 0,
      netFinancingCash: financingActivities.netFinancingCash || 0,
    },
    openingCash: openingCash || 0,
    closingCash: closingCash || 0,
    netChangeInCash: netChangeInCash || 0,
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