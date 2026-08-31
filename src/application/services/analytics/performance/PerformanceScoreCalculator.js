// src/application/services/analytics/performance/PerformanceScoreCalculator.js

/**
 * Performance Score Calculator - Investor Grade
 * 
 * Computes a weighted average of financial health metrics (0-100 scale):
 * - Revenue Momentum: 15% Weight
 * - Profitability Retention: 25% Weight
 * - Expense Control Efficiency: 15% Weight
 * - Cash Liquidity Velocity: 25% Weight
 * - Supply Chain Stability: 10% Weight
 * - Customer Risk Diversification: 10% Weight
 * 
 * Output Status Matrix: POSITIVE >=70 | NEUTRAL >=40 | NEGATIVE >=20 | CRITICAL <20
 * Aligned with IFRS Risk Dashboards + ConcentrationEngine
 */
class PerformanceScoreCalculator {
    _clamp(score) { return Math.max(0, Math.min(100, Math.round(score))); }

    compute(kpis, analysis) {
        // 1. Score each business pillar independently (0-100)
        const revenueScore = this._scoreRevenue(kpis.revenueGrowth);
        const profitScore = this._scoreProfit(kpis.netMargin);
        const expenseScore = this._scoreExpense(kpis.expenseRatio);
        const cashScore = this._scoreCash(kpis.netCashFlow, kpis.cashFlowMargin);
        const inventoryScore = this._scoreInventory(kpis.lowStockCount);
        const customerScore = this._scoreCustomer(kpis.customerConcentration);

        // 2. Weighted Matrix: Prioritizes Capital Strength (Profit + Cash = 50% total impact)
        const weightedAverage = this._clamp(
            revenueScore * 0.15 +
            profitScore * 0.25 +
            expenseScore * 0.15 +
            cashScore * 0.25 +
            inventoryScore * 0.10 +
            customerScore * 0.10
        );

        // 3. ✅ PRODUCTION FIX: 4-Tier status aligned with test + ConcentrationEngine
        const overallStatus = this._scoreToStatus(weightedAverage);

        return {
            overall: { score: weightedAverage, status: overallStatus },
            categories: {
                revenue: revenueScore,
                profitability: profitScore,
                expenses: expenseScore,
                cash: cashScore,
                inventory: inventoryScore,
                customers: customerScore
            }
        };
    }

    _scoreRevenue(growth) {
        if (growth > 30) return 100;
        if (growth > 15) return 85;
        if (growth > 0) return 70;
        if (growth > -10) return 40;
        return 20;
    }

    _scoreProfit(margin) {
        if (margin > 25) return 100;
        if (margin > 15) return 80;
        if (margin > 5) return 60;
        if (margin > 0) return 45;
        return 20;
    }

    _scoreExpense(ratio) {
        if (ratio < 30) return 100;
        if (ratio < 40) return 80;
        if (ratio < 50) return 60;
        if (ratio < 60) return 40;
        return 20;
    }

    _scoreCash(flow, margin) {
        const flowScore = flow > 0 ? 80 : 30;
        const marginScore = margin > 10 ? 100 : margin > 0 ? 70 : 30;
        return this._clamp((flowScore + marginScore) / 2);
    }

    _scoreInventory(alerts) {
        if (alerts === 0) return 100;
        if (alerts < 5) return 80;
        if (alerts < 15) return 60;
        return 40;
    }

    _scoreCustomer(concentration) {
        if (concentration < 30) return 100;
        if (concentration < 50) return 75;
        if (concentration < 70) return 50;
        return 25;
    }

    /**
     * ✅ PRODUCTION ACCURACY: 4-Tier Investor Risk Matrix
     * Matches ConcentrationEngine + Jest Test Suite
     */
    _scoreToStatus(score) {
        if (score >= 70) return 'POSITIVE';   // 70-100: Strong health
        if (score >= 40) return 'NEUTRAL';    // 40-69: Mixed signals. Monitor
        if (score >= 20) return 'NEGATIVE';   // 20-39: Underperforming
        return 'CRITICAL';                    // 0-19: Immediate intervention
    }
}

module.exports = PerformanceScoreCalculator;