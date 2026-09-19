// src/application/useCases/students/GetStudentUseCase.js

class GetStudentUseCase {
    constructor({ studentRepository }) {
        this.studentRepository = studentRepository;
    }

    async execute({ studentId, businessId }) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const student = await this.studentRepository.findById(studentId, businessId);
        if (!student) {
            throw new Error('Student not found');
        }

        return {
            success: true,
            student: student.toJSON(),
        };
    }
}

module.exports = GetStudentUseCase;