class PerformanceAnalyzer {
    _round2(num) { return Math.round(num * 100) / 100; }

    run(kpis, trends, concentration) {
        return {
            revenue: { 
                volume: this._round2(kpis.revenue), 
                growth: this._round2(kpis.revenueGrowth), 
                trend: trends?.trends?.revenue?.direction || 'STABLE' 
            },
            profitability: { 
                grossMargin: this._round2(kpis.grossMargin), 
                netMargin: this._round2(kpis.netMargin), 
                trend: trends?.trends?.profit?.direction || 'STABLE' 
            },
            expenses: { 
                ratio: this._round2(kpis.expenseRatio), 
                growth: this._round2(kpis.expenseGrowth) 
            },
            cash: { 
                netFlow: this._round2(kpis.netCashFlow), 
                margin: this._round2(kpis.cashFlowMargin) 
            },
            inventory: { 
                value: this._round2(kpis.inventoryValue), 
                alertCount: kpis.lowStockCount 
            },
            customers: { 
                count: kpis.customerCount, 
                concentration: this._round2(kpis.customerConcentration), 
                risk: concentration?.customers?.riskLevel || 'LOW' 
            }
        };
    }
}

module.exports = PerformanceAnalyzer;