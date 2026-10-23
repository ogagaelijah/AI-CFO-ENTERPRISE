// src/interfaces/http/routes/studentRoutes.js
// v1.1.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.

'use strict';

const express = require('express');
const router = express.Router();

const StudentRepository = require('../../../infrastructure/database/sqlite/repositories/StudentRepository');

const CreateStudentUseCase = require('../../../application/useCases/students/CreateStudentUseCase');
const GetStudentUseCase = require('../../../application/useCases/students/GetStudentUseCase');
const GetStudentsUseCase = require('../../../application/useCases/students/GetStudentsUseCase');
const UpdateStudentUseCase = require('../../../application/useCases/students/UpdateStudentUseCase');
const DeleteStudentUseCase = require('../../../application/useCases/students/DeleteStudentUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const studentRepo = new StudentRepository();

const createStudentUseCase = new CreateStudentUseCase({ studentRepository: studentRepo });
const getStudentUseCase = new GetStudentUseCase({ studentRepository: studentRepo });
const getStudentsUseCase = new GetStudentsUseCase({ studentRepository: studentRepo });
const updateStudentUseCase = new UpdateStudentUseCase({ studentRepository: studentRepo });
const deleteStudentUseCase = new DeleteStudentUseCase({ studentRepository: studentRepo });

router.use(authMiddleware);

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|enrolled|admission/i.test(msg)) return 400;
  return 500;
}

router.get('/', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const { limit = 50, offset = 0, status, search } = req.query;
        const result = await getStudentsUseCase.execute({
            businessId,
            status: status || null,
            search: search || null,
            limit, offset,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/students]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch students' });
    }
});

router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getStudentUseCase.execute({
            studentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/students/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const {
            fullName, gender, dateOfBirth,
            guardianName, guardianPhone, guardianEmail,
            address, admissionNumber, enrolledOn, metadata,
        } = req.body;
        const result = await createStudentUseCase.execute({
            businessId, fullName, gender, dateOfBirth,
            guardianName, guardianPhone, guardianEmail,
            address, admissionNumber, enrolledOn, metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/students]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const {
            fullName, gender, dateOfBirth,
            guardianName, guardianPhone, guardianEmail,
            address, status, enrolledOn, metadata,
        } = req.body;
        const result = await updateStudentUseCase.execute({
            studentId: parseInt(id, 10),
            businessId,
            fullName, gender, dateOfBirth,
            guardianName, guardianPhone, guardianEmail,
            address, status, enrolledOn, metadata,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/students/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await deleteStudentUseCase.execute({
            studentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/students/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;