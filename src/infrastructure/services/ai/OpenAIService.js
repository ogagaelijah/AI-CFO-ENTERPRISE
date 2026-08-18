// src/infrastructure/services/ai/OpenAIService.js

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || null;
        this.enabled = !!this.apiKey;
        
        if (!this.enabled) {
            console.log('⚠️ OpenAI API key not set. AI features will use fallback responses.');
        }
    }

    /**
     * Ask a question about business finances
     * @param {string} question - User's question
     * @param {Object} context - Business data context
     * @returns {Promise<string>} AI response
     */
    async askQuestion(question, context) {
        if (!this.enabled) {
            return this.getFallbackResponse(question, context);
        }

        try {
            // For now, use fallback since we're not integrating OpenAI yet
            // This can be replaced with actual OpenAI API call
            return this.getFallbackResponse(question, context);
        } catch (error) {
            console.error('OpenAI error:', error);
            return this.getFallbackResponse(question, context);
        }
    }

    /**
     * Get financial advice
     * @param {string} topic - Advice topic
     * @param {Object} context - Business data context
     * @returns {Promise<Object>} Advice with recommendations
     */
    async getFinancialAdvice(topic, context) {
        if (!this.enabled) {
            return this.getFallbackAdvice(topic, context);
        }

        try {
            // For now, use fallback since we're not integrating OpenAI yet
            return this.getFallbackAdvice(topic, context);
        } catch (error) {
            console.error('OpenAI error:', error);
            return this.getFallbackAdvice(topic, context);
        }
    }

    /**
     * Fallback response when OpenAI is not available
     */
    getFallbackResponse(question, context) {
        const lowerQuestion = question.toLowerCase();
        const metrics = context.metrics || {};

        // Sales-related questions
        if (lowerQuestion.includes('sales') || lowerQuestion.includes('revenue')) {
            return `📊 **Sales Analysis**

Based on your data:
• Total Revenue: ₦${(metrics.totalRevenue || 0).toLocaleString()}
• Total Sales: ₦${(metrics.totalSales || 0).toLocaleString()}
• Total Income: ₦${(metrics.totalIncome || 0).toLocaleString()}

${metrics.totalSales > metrics.totalIncome ? 'Your main revenue comes from direct sales.' : 'You have significant income from other sources.'}

💡 **Tip:** To increase sales, consider running promotions or reaching out to past customers.`;
        }

        // Profit-related questions
        if (lowerQuestion.includes('profit') || lowerQuestion.includes('margin')) {
            const profit = metrics.netProfit || 0;
            const revenue = metrics.totalRevenue || 0;
            const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;

            return `💰 **Profit Analysis**

• Net Profit: ₦${profit.toLocaleString()}
• Profit Margin: ${margin.toFixed(1)}%
• Total Revenue: ₦${revenue.toLocaleString()}
• Total Costs: ₦${(metrics.totalCosts || 0).toLocaleString()}

${margin > 20 ? '✅ Your profit margin is healthy!' : '⚠️ Your profit margin could be improved.'}

💡 **Tip:** ${margin <= 20 ? 'Consider reducing costs or increasing prices to improve your margin.' : 'Keep up the good work! Consider reinvesting profits.'}`;
        }

        // Debtor-related questions
        if (lowerQuestion.includes('debtor') || lowerQuestion.includes('owes') || lowerQuestion.includes('debt')) {
            return `👥 **Debtors Analysis**

• Total Outstanding: ₦${(metrics.totalOutstanding || 0).toLocaleString()}
• Total Overdue: ₦${(metrics.totalOverdue || 0).toLocaleString()}
• Number of Debtors: ${metrics.debtorCount || 0}

${metrics.totalOverdue > 0 ? '⚠️ Some debts are overdue. Consider sending payment reminders.' : '✅ All debts are within payment terms.'}

💡 **Tip:** ${metrics.totalOverdue > 0 ? 'Follow up with overdue customers to improve cash flow.' : 'Consider offering early payment discounts to incentivize faster payments.'}`;
        }

        // Inventory-related questions
        if (lowerQuestion.includes('inventory') || lowerQuestion.includes('stock')) {
            return `📦 **Inventory Analysis**

• Total Value: ₦${(metrics.inventoryValue || 0).toLocaleString()}
• Low Stock Items: ${metrics.lowStockCount || 0}

${metrics.lowStockCount > 0 ? `⚠️ ${metrics.lowStockCount} items are running low.` : '✅ Inventory levels are healthy.'}

💡 **Tip:** ${metrics.lowStockCount > 0 ? 'Reorder low stock items to avoid running out.' : 'Consider optimizing inventory to reduce holding costs.'}`;
        }

        // General response
        return `📊 **Business Summary**

Here's an overview of your business:

• Revenue: ₦${(metrics.totalRevenue || 0).toLocaleString()}
• Profit: ₦${(metrics.netProfit || 0).toLocaleString()}
• Outstanding Debt: ₦${(metrics.totalOutstanding || 0).toLocaleString()}
• Inventory Value: ₦${(metrics.inventoryValue || 0).toLocaleString()}

💡 **How can I help?** Ask me about:
• Sales and Revenue
• Profit and Margins
• Debtors and Payments
• Inventory Management
• Expenses and Costs
• Business Recommendations`;
    }

    /**
     * Fallback advice when OpenAI is not available
     */
    getFallbackAdvice(topic, context) {
        const metrics = context.metrics || {};
        const topics = context.topics || {};

        let advice = '';
        let recommendations = [];

        switch (topic) {
            case 'revenue':
                advice = `📊 **Revenue Advice**

Based on your business data:

• Total Revenue: ₦${(metrics.totalRevenue || 0).toLocaleString()}
• Revenue Trend: ${topics.revenue?.trend?.direction || 'stable'}

**Recommendations:**
1. Review your pricing strategy
2. Identify your top-performing products/services
3. Consider upselling to existing customers
4. Explore new revenue streams`;
                recommendations = [
                    'Review and optimize your pricing',
                    'Focus on high-margin products',
                    'Increase customer retention',
                    'Expand to new markets',
                ];
                break;

            case 'costs':
                advice = `💰 **Cost Reduction Advice**

Based on your business data:

• Total Costs: ₦${(metrics.totalCosts || 0).toLocaleString()}
• Cost Breakdown: ${Object.entries(topics.expenses?.breakdown || {})
    .map(([k, v]) => `${k}: ₦${v.toLocaleString()}`)
    .join(', ') || 'No expense data available'}

**Recommendations:**
1. Review recurring expenses
2. Negotiate with suppliers
3. Reduce discretionary spending
4. Optimize operational efficiency`;
                recommendations = [
                    'Audit your recurring expenses',
                    'Negotiate better rates with suppliers',
                    'Reduce unnecessary overhead',
                    'Automate manual processes',
                ];
                break;

            case 'general':
            default:
                advice = `💡 **General Financial Advice**

Here's an overview of your business health:

• Revenue: ₦${(metrics.totalRevenue || 0).toLocaleString()}
• Profit: ₦${(metrics.netProfit || 0).toLocaleString()}
• Profit Margin: ${metrics.profitMargin || 0}%
• Outstanding Debt: ₦${(metrics.totalOutstanding || 0).toLocaleString()}

**Key Recommendations:**
1. Monitor your cash flow regularly
2. Keep track of outstanding debts
3. Review expenses monthly
4. Plan for growth and reinvestment`;
                recommendations = [
                    'Track your cash flow weekly',
                    'Send payment reminders to debtors',
                    'Review and reduce unnecessary expenses',
                    'Set aside funds for business growth',
                ];
                break;
        }

        return {
            advice,
            recommendations,
        };
    }
}

module.exports = OpenAIService;