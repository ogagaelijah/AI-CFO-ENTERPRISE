// src/application/useCases/onboarding/CustomizeCategoriesUseCase.js

class CustomizeCategoriesUseCase {
    constructor({ businessRepository }) {
        this.businessRepository = businessRepository;
    }

    async execute({ businessId, categories }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!categories || typeof categories !== 'object') {
            throw new Error('Categories must be an object');
        }

        const business = await this.businessRepository.findById(businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        // Validate categories structure
        const validCategories = ['sales', 'income', 'purchases', 'expenses'];
        const providedCategories = Object.keys(categories);

        for (const category of providedCategories) {
            if (!validCategories.includes(category)) {
                throw new Error(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
            }
            if (!Array.isArray(categories[category])) {
                throw new Error(`Category ${category} must be an array`);
            }
            if (categories[category].length === 0) {
                throw new Error(`Category ${category} cannot be empty`);
            }
        }

        // Merge with existing categories
        const existingCategories = business.categories || {};
        const updatedCategories = {
            sales: categories.sales || existingCategories.sales || [],
            income: categories.income || existingCategories.income || [],
            purchases: categories.purchases || existingCategories.purchases || [],
            expenses: categories.expenses || existingCategories.expenses || [],
        };

        business.categories = updatedCategories;
        business.updatedAt = new Date();

        await this.businessRepository.update(business.id, business);

        return {
            success: true,
            business: business.toJSON(),
            message: 'Categories updated successfully',
        };
    }
}

module.exports = CustomizeCategoriesUseCase;