-- Migration: Drop the retired inventory_transactions table
-- Superseded by inventory_movements (migration 022). No production code writes
-- to or reads from this table after the RecordPurchaseUseCase migration to
-- InventoryMovementRepository. Safe to drop.

DROP TABLE IF EXISTS inventory_transactions;