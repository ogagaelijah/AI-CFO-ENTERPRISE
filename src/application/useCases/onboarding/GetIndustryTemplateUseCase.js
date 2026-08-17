// src/application/useCases/onboarding/GetIndustryTemplateUseCase.js

const { INDUSTRIES } = require('../../../config/industries');

class GetIndustryTemplateUseCase {
    async execute(industryId) {
        const industry = INDUSTRIES[industryId];
        if (!industry) {
            throw new Error(`Invalid industry: ${industryId}`);
        }

        return {
            id: industry.id,
            name: industry.name,
            icon: industry.icon,
            features: industry.features,
            categories: industry.categories,
            kpis: industry.kpis || [],
        };
    }

    getAllIndustries() {
        return Object.keys(INDUSTRIES).map(key => ({
            id: INDUSTRIES[key].id,
            name: INDUSTRIES[key].name,
            icon: INDUSTRIES[key].icon,
            description: INDUSTRIES[key].description || '',
        }));
    }
}

module.exports = GetIndustryTemplateUseCase;