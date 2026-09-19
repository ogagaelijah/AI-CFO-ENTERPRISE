// src/application/useCases/students/UpdateStudentUseCase.js

class UpdateStudentUseCase {
    constructor({ studentRepository }) {
        this.studentRepository = studentRepository;
    }

    async execute({
        studentId,
        businessId,
        fullName,
        gender,
        dateOfBirth,
        guardianName,
        guardianPhone,
        guardianEmail,
        address,
        status,
        enrolledOn,
        metadata,
    }) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.studentRepository.findById(studentId, businessId);
        if (!existing) {
            throw new Error('Student not found');
        }

        const updateData = {};

        if (fullName !== undefined) {
            const trimmed = String(fullName).trim();
            if (!trimmed) {
                throw new Error('Student full name cannot be empty');
            }
            updateData.fullName = trimmed;
        }
        if (gender !== undefined) {
            const norm = gender ? String(gender).toUpperCase() : null;
            const VALID = ['MALE', 'FEMALE', 'OTHER'];
            if (norm && !VALID.includes(norm)) {
                throw new Error(`Invalid gender. Must be one of: ${VALID.join(', ')}`);
            }
            updateData.gender = norm;
        }
        if (dateOfBirth !== undefined) {
            updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        }
        if (guardianName !== undefined) updateData.guardianName = guardianName;
        if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
        if (guardianEmail !== undefined) {
            updateData.guardianEmail = guardianEmail ? String(guardianEmail).trim().toLowerCase() : null;
        }
        if (address !== undefined) updateData.address = address;
        if (status !== undefined) {
            const norm = String(status).toUpperCase();
            const VALID = ['ACTIVE', 'GRADUATED', 'WITHDRAWN', 'SUSPENDED'];
            if (!VALID.includes(norm)) {
                throw new Error(`Invalid status. Must be one of: ${VALID.join(', ')}`);
            }
            updateData.status = norm;
        }
        if (enrolledOn !== undefined) {
            updateData.enrolledOn = enrolledOn ? new Date(enrolledOn) : null;
        }
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                student: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.studentRepository.update(studentId, businessId, updateData);

        return {
            success: true,
            student: updated.toJSON(),
            message: 'Student updated successfully',
        };
    }
}

module.exports = UpdateStudentUseCase;