// src/application/useCases/students/CreateStudentUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateStudentUseCase {
    constructor({ studentRepository }) {
        this.studentRepository = studentRepository;
    }

    async execute({
        businessId,
        fullName,
        gender = null,
        dateOfBirth = null,
        guardianName = null,
        guardianPhone = null,
        guardianEmail = null,
        address = null,
        admissionNumber = null,
        enrolledOn = null,
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!fullName || !String(fullName).trim()) {
            throw new Error('Student full name is required');
        }

        // Generate admission number server-side if not supplied.
        const finalAdmissionNumber = admissionNumber
            ? String(admissionNumber).trim()
            : await this.studentRepository.nextAdmissionNumber(businessId);

        if (!finalAdmissionNumber) {
            throw new Error('Admission number could not be generated');
        }

        // Guard against duplicates within the same business.
        const existing = await this.studentRepository.findByAdmissionNumber(
            businessId,
            finalAdmissionNumber
        );
        if (existing) {
            throw new Error(`Admission number ${finalAdmissionNumber} already exists`);
        }

        const Student = require('../../../domain/entities/Student');
        const student = new Student({
            businessId,
            admissionNumber: finalAdmissionNumber,
            fullName,
            gender,
            dateOfBirth,
            guardianName,
            guardianPhone,
            guardianEmail,
            address,
            status: 'ACTIVE',
            enrolledOn: enrolledOn || new Date(),
            metadata,
        });

        const saved = await withTransaction(async () => {
            return await this.studentRepository.create(student);
        });

        return {
            success: true,
            student: saved.toJSON(),
            message: `Student ${saved.fullName} created (${saved.admissionNumber})`,
        };
    }
}

module.exports = CreateStudentUseCase;