CREATE TABLE IF NOT EXISTS partner_payouts (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  bank_details JSONB,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payouts_partner ON partner_payouts(partner_id);
CREATE INDEX idx_payouts_status ON partner_payouts(status);