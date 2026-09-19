// src/interfaces/http/routes/studentRoutes.js

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
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const studentRepo = new StudentRepository();

const createStudentUseCase = new CreateStudentUseCase({ studentRepository: studentRepo });
const getStudentUseCase = new GetStudentUseCase({ studentRepository: studentRepo });
const getStudentsUseCase = new GetStudentsUseCase({ studentRepository: studentRepo });
const updateStudentUseCase = new UpdateStudentUseCase({ studentRepository: studentRepo });
const deleteStudentUseCase = new DeleteStudentUseCase({ studentRepository: studentRepo });

router.use(authMiddleware);

router.get('/', async (req, res) => {
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
            limit,
            offset,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/students]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch students' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getStudentUseCase.execute({
            studentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 500;
        console.error('❌ [GET /api/students/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.post('/', invalidateAfterWrite, async (req, res) => {
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
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', invalidateAfterWrite, async (req, res) => {
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
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/students/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await deleteStudentUseCase.execute({
            studentId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [DELETE /api/students/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;