ALTER TABLE subscriptions 
ADD COLUMN auto_renew BOOLEAN DEFAULT true,
ADD COLUMN paystack_authorization_code VARCHAR(255);