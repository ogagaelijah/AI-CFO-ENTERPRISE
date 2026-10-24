-- 034_add_sales_to_notifications.sql
-- Allows the notifications table to handle non-debtor events (like sales)

-- 1. Allow debtor_id to be null so sales can be inserted
ALTER TABLE notifications ALTER COLUMN debtor_id DROP NOT NULL;

-- 2. Update the type check constraint to allow NEW_SALE
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('OVERDUE_DEBTOR', 'NEW_SALE'));