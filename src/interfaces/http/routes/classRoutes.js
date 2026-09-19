// src/interfaces/http/routes/classRoutes.js

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

router.get('/', async (req, res) => {
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
            limit,
            offset,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/classes]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch classes' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getClassUseCase.execute({
            classId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 500;
        console.error('❌ [GET /api/classes/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.post('/', invalidateAfterWrite, async (req, res) => {
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
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', invalidateAfterWrite, async (req, res) => {
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
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/classes/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await deleteClassUseCase.execute({
            classId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [DELETE /api/classes/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;