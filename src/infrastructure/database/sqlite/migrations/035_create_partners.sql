CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  partner_code VARCHAR(100) UNIQUE NOT NULL,
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partners_user ON partners(user_id);
CREATE INDEX idx_partners_business ON partners(business_id);
CREATE INDEX idx_partners_code ON partners(partner_code);