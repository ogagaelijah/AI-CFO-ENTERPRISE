CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referred_business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  months_paid INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_business_id) -- A business can only be referred once
);

CREATE INDEX idx_referrals_partner ON referrals(partner_id);

-- Add column to existing businesses table
ALTER TABLE businesses 
ADD COLUMN referred_by_partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_businesses_referred_by ON businesses(referred_by_partner_id);