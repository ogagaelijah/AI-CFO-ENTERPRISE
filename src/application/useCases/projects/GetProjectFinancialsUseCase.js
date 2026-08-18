// src/application/useCases/projects/GetProjectFinancialsUseCase.js

class GetProjectFinancialsUseCase {
    constructor({
        projectRepository,
        saleRepository,
        purchaseRepository,
        expenseRepository,
    }) {
        this.projectRepository = projectRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
    }

    async execute({ projectId, businessId }) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Verify business ownership
        if (project.businessId !== businessId) {
            throw new Error('Access denied: Project does not belong to this business');
        }

        // Get all sales linked to this project
        const sales = await this.saleRepository.findByProjectId(
            businessId,
            projectId
        );

        // Get all purchases linked to this project
        const purchases = await this.purchaseRepository.findByProjectId(
            businessId,
            projectId
        );

        // Get all expenses linked to this project
        const expenses = await this.expenseRepository.findByProjectId(
            businessId,
            projectId
        );

        // Calculate totals
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalCosts = purchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                          expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalProfit = totalRevenue - totalCosts;

        // Payment status breakdown for sales
        const salesPaid = sales
            .filter(s => s.paymentStatus === 'PAID')
            .reduce((sum, s) => sum + s.totalAmount, 0);
        const salesUnpaid = sales
            .filter(s => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL')
            .reduce((sum, s) => sum + s.totalAmount, 0);

        // Payment status breakdown for purchases
        const purchasesPaid = purchases
            .filter(p => p.paymentStatus === 'PAID')
            .reduce((sum, p) => sum + p.totalAmount, 0);
        const purchasesUnpaid = purchases
            .filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL')
            .reduce((sum, p) => sum + p.totalAmount, 0);

        // Calculate progress (if budget is set)
        const progress = project.budget > 0
            ? ((totalRevenue / project.budget) * 100).toFixed(1)
            : 0;

        return {
            success: true,
            project: project.toJSON(),
            financials: {
                budget: project.budget,
                totalRevenue,
                totalCosts,
                totalProfit,
                profitMargin: totalRevenue > 0
                    ? ((totalProfit / totalRevenue) * 100).toFixed(1)
                    : 0,
                progress: progress + '%',
                sales: {
                    total: sales.length,
                    totalAmount: totalRevenue,
                    paid: salesPaid,
                    unpaid: salesUnpaid,
                },
                purchases: {
                    total: purchases.length,
                    totalAmount: totalCosts,
                    paid: purchasesPaid,
                    unpaid: purchasesUnpaid,
                },
                expenses: {
                    total: expenses.length,
                    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
                },
            },
            sales: sales.map(s => s.toJSON()),
            purchases: purchases.map(p => p.toJSON()),
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetProjectFinancialsUseCase;