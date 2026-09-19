// src/interfaces/http/routes/enrollmentRoutes.js

'use strict';

const express = require('express');
const router = express.Router();

const EnrollmentRepository = require('../../../infrastructure/database/sqlite/repositories/EnrollmentRepository');
const StudentRepository = require('../../../infrastructure/database/sqlite/repositories/StudentRepository');
const ClassRepository = require('../../../infrastructure/database/sqlite/repositories/ClassRepository');

const EnrollStudentUseCase = require('../../../application/useCases/enrollments/EnrollStudentUseCase');
const GetEnrollmentUseCase = require('../../../application/useCases/enrollments/GetEnrollmentUseCase');
const GetEnrollmentsUseCase = require('../../../application/useCases/enrollments/GetEnrollmentsUseCase');
const UnenrollStudentUseCase = require('../../../application/useCases/enrollments/UnenrollStudentUseCase');
const PromoteEnrollmentUseCase = require('../../../application/useCases/enrollments/PromoteEnrollmentUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const enrollmentRepo = new EnrollmentRepository();
const studentRepo = new StudentRepository();
const classRepo = new ClassRepository();

const enrollStudentUseCase = new EnrollStudentUseCase({
    enrollmentRepository: enrollmentRepo,
    studentRepository: studentRepo,
    classRepository: classRepo,
});
const getEnrollmentUseCase = new GetEnrollmentUseCase({ enrollmentRepository: enrollmentRepo });
const getEnrollmentsUseCase = new GetEnrollmentsUseCase({ enrollmentRepository: enrollmentRepo });
const unenrollStudentUseCase = new UnenrollStudentUseCase({ enrollmentRepository: enrollmentRepo });
const promoteEnrollmentUseCase = new PromoteEnrollmentUseCase({
    enrollmentRepository: enrollmentRepo,
    studentRepository: studentRepo,
    classRepository: classRepo,
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const { limit = 50, offset = 0, studentId, classId, session, term, status } = req.query;
        const result = await getEnrollmentsUseCase.execute({
            businessId,
            studentId: studentId ? parseInt(studentId, 10) : null,
            classId: classId ? parseInt(classId, 10) : null,
            session: session || null,
            term: term || null,
            status: status || null,
            limit,
            offset,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/enrollments]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch enrollments' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getEnrollmentUseCase.execute({
            enrollmentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 500;
        console.error('❌ [GET /api/enrollments/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const { studentId, classId, term, session, enrolledOn, metadata } = req.body;
        const result = await enrollStudentUseCase.execute({
            businessId,
            studentId: studentId ? parseInt(studentId, 10) : null,
            classId: classId ? parseInt(classId, 10) : null,
            term,
            session,
            enrolledOn: enrolledOn ? new Date(enrolledOn) : new Date(),
            metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/enrollments]', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/:id/promote', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const { newClassId, newTerm, newSession, metadata } = req.body;
        const result = await promoteEnrollmentUseCase.execute({
            enrollmentId: parseInt(id, 10),
            businessId,
            newClassId: newClassId ? parseInt(newClassId, 10) : null,
            newTerm,
            newSession,
            metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [POST /api/enrollments/:id/promote]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.post('/:id/unenroll', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const { reason } = req.body;
        const result = await unenrollStudentUseCase.execute({
            enrollmentId: parseInt(id, 10),
            businessId,
            reason: reason || null,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [POST /api/enrollments/:id/unenroll]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;