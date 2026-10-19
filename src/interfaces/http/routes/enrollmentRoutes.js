// src/interfaces/http/routes/enrollmentRoutes.js
// v1.2.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.
// v1.1.0-prod — GET / pagination standardized.

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
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

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

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate|active enrollment/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

router.get('/', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { studentId, classId, session, term, status } = req.query;
        const { page, limit, offset } = parsePagination(req.query);

        const result = await getEnrollmentsUseCase.execute({
            businessId,
            studentId: studentId ? parseInt(studentId, 10) : null,
            classId: classId ? parseInt(classId, 10) : null,
            session: session || null,
            term: term || null,
            status: status || null,
            limit, offset,
        });

        const total = result?.pagination?.total || 0;

        res.json({
            ...result,
            pagination: buildPaginationMeta({ page, limit, total }),
        });
    } catch (error) {
        console.error('❌ [GET /api/enrollments]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch enrollments' });
    }
});

router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getEnrollmentUseCase.execute({
            enrollmentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/enrollments/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
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
            term, session,
            enrolledOn: enrolledOn ? new Date(enrolledOn) : new Date(),
            metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/enrollments]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/:id/promote', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const { newClassId, newTerm, newSession, metadata } = req.body;
        const result = await promoteEnrollmentUseCase.execute({
            enrollmentId: parseInt(id, 10),
            businessId,
            newClassId: newClassId ? parseInt(newClassId, 10) : null,
            newTerm, newSession, metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/enrollments/:id/promote]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/:id/unenroll', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
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
        console.error('❌ [POST /api/enrollments/:id/unenroll]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;