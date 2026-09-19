// src/application/useCases/classes/GetClassUseCase.js

class GetClassUseCase {
    constructor({ classRepository }) {
        this.classRepository = classRepository;
    }

    async execute({ classId, businessId }) {
        if (!classId) {
            throw new Error('Class ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const klass = await this.classRepository.findById(classId, businessId);
        if (!klass) {
            throw new Error('Class not found');
        }

        return {
            success: true,
            class: klass.toJSON(),
        };
    }
}

module.exports = GetClassUseCase;