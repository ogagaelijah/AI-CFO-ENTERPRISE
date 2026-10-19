// src/interfaces/http/routes/classRoutes.js
// v1.1.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.

'use strict';

const express = require('express');
const router = express.Router();

const ClassRepository = require('../../../infrastructure/database/sqlite/repositories/ClassRepository');
const EnrollmentRepository = require('../../../infrastructure/database/sqlite/repositories/EnrollmentRepository');

const CreateClassUseCase = require('../../../application/useCases/classes/CreateClassUseCase');
const GetClassUseCase = require('../../../application/useCases/classes/GetClassUseCase');
const GetClassesUseCase = require('../../../application/useCases/classes/GetClassesUseCase');
const UpdateClassUseCase = require('../../../application/useCases/classes/UpdateClassUseCase');
const DeleteClassUseCase = require('../../../application/useCases/classes/DeleteClassUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const classRepo = new ClassRepository();
const enrollmentRepo = new EnrollmentRepository();

const createClassUseCase = new CreateClassUseCase({ classRepository: classRepo });
const getClassUseCase = new GetClassUseCase({ classRepository: classRepo });
const getClassesUseCase = new GetClassesUseCase({ classRepository: classRepo });
const updateClassUseCase = new UpdateClassUseCase({ classRepository: classRepo });
const deleteClassUseCase = new DeleteClassUseCase({
    classRepository: classRepo,
    enrollmentRepository: enrollmentRepo,
});

router.use(authMiddleware);

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|enrollments/i.test(msg)) return 400;
  return 500;
}

router.get('/', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const { limit = 50, offset = 0, status, level, search } = req.query;
        const result = await getClassesUseCase.execute({
            businessId,
            status: status || null,
            level: level || null,
            search: search || null,
            limit, offset,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/classes]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch classes' });
    }
});

router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getClassUseCase.execute({
            classId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/classes/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }
        const { name, level, termFee, description, metadata } = req.body;
        const result = await createClassUseCase.execute({
            businessId, name, level, termFee, description, metadata,
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/classes]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const { name, level, termFee, description, status, metadata } = req.body;
        const result = await updateClassUseCase.execute({
            classId: parseInt(id, 10),
            businessId,
            name, level, termFee, description, status, metadata,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/classes/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await deleteClassUseCase.execute({
            classId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/classes/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;