// frontend/src/services/reportMappers/balanceSheetReportMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapBalanceSheetReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyBalanceSheetReport();
  }

  const {
    asAtDate,
    assets = {},
    liabilities = {},
    equity = {},
    control = {},
  } = backendData;

  return {
    asAtDate: asAtDate || today(),
    assets: {
      currentAssets: {
        cash: toNumber(assets.currentAssets?.cash),
        accountsReceivable: toNumber(assets.currentAssets?.accountsReceivable),
        inventory: toNumber(assets.currentAssets?.inventory),
        otherCurrentAssets: toNumber(assets.currentAssets?.otherCurrentAssets),
        total: toNumber(assets.currentAssets?.total),
      },
      nonCurrentAssets: {
        propertyAndEquipment: toNumber(assets.nonCurrentAssets?.propertyAndEquipment),
        otherNonCurrentAssets: toNumber(assets.nonCurrentAssets?.otherNonCurrentAssets),
        total: toNumber(assets.nonCurrentAssets?.total),
      },
      totalAssets: toNumber(assets.totalAssets),
    },
    liabilities: {
      currentLiabilities: {
        accountsPayable: toNumber(liabilities.currentLiabilities?.accountsPayable),
        shortTermDebt: toNumber(liabilities.currentLiabilities?.shortTermDebt),
        otherCurrentLiabilities: toNumber(liabilities.currentLiabilities?.otherCurrentLiabilities),
        total: toNumber(liabilities.currentLiabilities?.total),
      },
      nonCurrentLiabilities: {
        longTermDebt: toNumber(liabilities.nonCurrentLiabilities?.longTermDebt),
        otherNonCurrentLiabilities: toNumber(liabilities.nonCurrentLiabilities?.otherNonCurrentLiabilities),
        total: toNumber(liabilities.nonCurrentLiabilities?.total),
      },
      totalLiabilities: toNumber(liabilities.totalLiabilities),
    },
    equity: {
      ownersCapital: toNumber(equity.ownersCapital),
      retainedEarnings: toNumber(equity.retainedEarnings),
      otherEquity: toNumber(equity.otherEquity),
      lessDrawings: toNumber(equity.lessDrawings),
      totalEquity: toNumber(equity.totalEquity),
    },
    control: {
      liabilitiesAndEquity: toNumber(control.liabilitiesAndEquity),
      difference: toNumber(control.difference),
      isBalanced: Boolean(control.isBalanced),
    },
  };
};

const getEmptyBalanceSheetReport = () => ({
  asAtDate: today(),
  assets: {
    currentAssets: {
      cash: 0,
      accountsReceivable: 0,
      inventory: 0,
      otherCurrentAssets: 0,
      total: 0,
    },
    nonCurrentAssets: {
      propertyAndEquipment: 0,
      otherNonCurrentAssets: 0,
      total: 0,
    },
    totalAssets: 0,
  },
  liabilities: {
    currentLiabilities: {
      accountsPayable: 0,
      shortTermDebt: 0,
      otherCurrentLiabilities: 0,
      total: 0,
    },
    nonCurrentLiabilities: {
      longTermDebt: 0,
      otherNonCurrentLiabilities: 0,
      total: 0,
    },
    totalLiabilities: 0,
  },
  equity: {
    ownersCapital: 0,
    retainedEarnings: 0,
    otherEquity: 0,
    lessDrawings: 0,
    totalEquity: 0,
  },
  control: {
    liabilitiesAndEquity: 0,
    difference: 0,
    isBalanced: false,
  },
});