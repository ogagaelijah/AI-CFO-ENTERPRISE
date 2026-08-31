// src/application/services/analytics/health/BusinessHealthScore.js

class BusinessHealthScore {
    _round(val) { return Math.max(0, Math.min(100, Math.round(val || 0))); }
    _safe(val, def = 0) { return typeof val === 'number' && !isNaN(val) ? val : def; }

    calculate({ kpis = {}, ratios = {}, performance = {}, trends = {}, concentration = {} } = {}) {
        const profitability = this._scoreProfit(this._safe(kpis.netMargin, null));
        const revenueGrowth = this._scoreGrowth(this._safe(kpis.revenueGrowth, null));
        const cashPosition = this._scoreCash(this._safe(kpis.netCashFlow, null), this._safe(kpis.cashFlowMargin, null));
        const expenseControl = this._scoreExpense(this._safe(kpis.expenseRatio, null));
        const inventoryHealth = this._scoreInventory(this._safe(kpis.lowStockCount, null));
        const customerHealth = this._scoreCustomer(this._safe(kpis.customerConcentration, null));

        const currentRatioVal = ratios?.liquidity?.currentRatio?.value ?? ratios?.currentRatio ?? null;
        const debtToEquityVal = ratios?.leverage?.debtToEquity?.value ?? ratios?.debtToEquity ?? null;
        const liquidityScore = this._round(currentRatioVal !== null ? (currentRatioVal > 2 ? 100 : currentRatioVal * 50) : 50);
        const leverageScore = this._round(debtToEquityVal !== null ? (debtToEquityVal < 1 ? 100 : Math.max(0, 100 - debtToEquityVal * 20)) : 50);

        const performanceScore = performance?.scores?.overall?.score ?? 50;
        const trendDir = trends?.trends?.revenue?.direction;
        const trendScore = (trendDir === 'UP' || trendDir === 'STRONG_UP') ? 80 : 50;
        const customerRisk = concentration?.customers?.riskLevel;
        const concentrationScore = customerRisk === 'LOW' ? 100 : 60;
        const riskScore = this._round((trendScore + concentrationScore) / 2);

        const overallScore = this._round(
            profitability * 0.20 + revenueGrowth * 0.10 + cashPosition * 0.20 +
            expenseControl * 0.10 + inventoryHealth * 0.05 + customerHealth * 0.05 +
            liquidityScore * 0.10 + leverageScore * 0.10 + performanceScore * 0.10
        );

        const overallStatus = this._scoreToStatus(overallScore);
        const components = {
            profitability: { score: profitability, status: this._tier(profitability) },
            revenueGrowth: { score: revenueGrowth, status: this._tier(revenueGrowth) },
            cashPosition: { score: cashPosition, status: this._tier(cashPosition) },
            expenseControl: { score: expenseControl, status: this._tier(expenseControl) },
            inventoryHealth: { score: inventoryHealth, status: this._tier(inventoryHealth) },
            customerHealth: { score: customerHealth, status: this._tier(customerHealth) },
            liquidity: { score: liquidityScore, status: this._tier(liquidityScore) },
            leverage: { score: leverageScore, status: this._tier(leverageScore) },
            performance: { score: performanceScore, status: this._tier(performanceScore) },
            riskProfile: { score: riskScore, status: this._tier(riskScore) }
        };

        return { overallScore, overallStatus, components, recommendations: this._generateRecommendations(components) };
    }

    // ✅ PROD FIX: Return 50 when data is missing/null
    _scoreProfit(margin) {
        if (margin === null) return 50;
        if (margin > 25) return 100; if (margin > 15) return 80; if (margin > 5) return 60; if (margin > 0) return 45; return 20;
    }
    _scoreGrowth(growth) {
        if (growth === null) return 50;
        if (growth > 30) return 100; if (growth > 15) return 85; if (growth > 0) return 70; if (growth > -10) return 40; return 20;
    }
    _scoreCash(flow, margin) {
        if (flow === null && margin === null) return 50;
        const s1 = flow === null ? 50 : (flow > 0 ? 80 : 30);
        const s2 = margin === null ? 50 : (margin > 10 ? 100 : margin > 0 ? 70 : 30);
        return this._round((s1 + s2) / 2);
    }
    _scoreExpense(ratio) {
        if (ratio === null) return 50;
        if (ratio < 30) return 100; if (ratio < 40) return 80; if (ratio < 50) return 60; if (ratio < 60) return 40; return 20;
    }
    _scoreInventory(alerts) {
        if (alerts === null) return 50;
        if (alerts === 0) return 100; if (alerts < 5) return 80; if (alerts < 15) return 60; return 40;
    }
    _scoreCustomer(concentration) {
        if (concentration === null) return 50;
        if (concentration < 30) return 100; if (concentration < 50) return 75; if (concentration < 70) return 50; return 25;
    }

    _scoreToStatus(s) { if (s >= 80) return 'EXCELLENT'; if (s >= 60) return 'GOOD'; if (s >= 40) return 'NEUTRAL'; return 'CRITICAL'; }
    _tier(s) { return s > 75 ? 'STRONG' : s > 50 ? 'MODERATE' : 'WEAK'; }

    _generateRecommendations(c) {
        const list = [];
        if (c.cashPosition.score < 50) list.push({ recommendation: 'Deploy defensive cash management and optimize AR collection' });
        if (c.expenseControl.score < 50) list.push({ recommendation: 'Conduct operational expenditure review to eliminate cost leaks' });
        if (c.customerHealth.score < 50) list.push({ recommendation: 'Diversify customer base to reduce concentration risk' });
        return list;
    }
}

module.exports = { BusinessHealthScore };