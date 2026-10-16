// src/interfaces/http/routes/supplierRoutes.js
// v1.1.1-prod — Error classification: user errors return 400/404/409, not 500.
// v1.1.0-prod — Write routes require OWNER/ADMIN/MANAGER.
// v1.0.0-prod — Initial.

const express = require('express');
const router = express.Router();
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const GetSuppliersUseCase = require('../../../application/useCases/suppliers/GetSuppliersUseCase');
const GetSupplierUseCase = require('../../../application/useCases/suppliers/GetSupplierUseCase');
const CreateSupplierUseCase = require('../../../application/useCases/suppliers/CreateSupplierUseCase');
const UpdateSupplierUseCase = require('../../../application/useCases/suppliers/UpdateSupplierUseCase');
const DeleteSupplierUseCase = require('../../../application/useCases/suppliers/DeleteSupplierUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const supplierRepo = new SupplierRepository();

const getSuppliersUseCase = new GetSuppliersUseCase({ supplierRepository: supplierRepo });
const getSupplierUseCase = new GetSupplierUseCase({ supplierRepository: supplierRepo });
const createSupplierUseCase = new CreateSupplierUseCase({ supplierRepository: supplierRepo });
const updateSupplierUseCase = new UpdateSupplierUseCase({ supplierRepository: supplierRepo });
const deleteSupplierUseCase = new DeleteSupplierUseCase({ supplierRepository: supplierRepo });

router.use(authMiddleware);

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

// =============================================
// GET /api/suppliers
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId || req.query.businessId;
        const { limit = 50, offset = 0, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await getSuppliersUseCase.execute({
            businessId,
            limit: parseInt(limit),
            offset: parseInt(offset),
            search: search || null,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching suppliers:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch suppliers' });
    }
});

// =============================================
// GET /api/suppliers/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await getSupplierUseCase.execute({ id: parseInt(id), businessId });

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching supplier:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch supplier' });
    }
});

// =============================================
// POST /api/suppliers — OWNER / ADMIN / MANAGER
// =============================================
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { name, phone, email, address, notes, metadata } = req.body;

        const result = await createSupplierUseCase.execute({
            businessId, name, phone, email, address, notes, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ Error creating supplier:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to create supplier' });
    }
});

// =============================================
// PUT /api/suppliers/:id — OWNER / ADMIN / MANAGER
// =============================================
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { name, phone, email, address, notes, metadata } = req.body;

        const result = await updateSupplierUseCase.execute({
            id: parseInt(id), businessId, name, phone, email, address, notes, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error updating supplier:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to update supplier' });
    }
});

// =============================================
// DELETE /api/suppliers/:id — OWNER / ADMIN / MANAGER
// =============================================
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await deleteSupplierUseCase.execute({ id: parseInt(id), businessId });

        res.json(result);
    } catch (error) {
        console.error('❌ Error deleting supplier:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to delete supplier' });
    }
});

module.exports = router;