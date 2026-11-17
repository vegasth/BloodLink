-- BloodLink database schema (academic prototype)

-- 1. USERS: every account in the system
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor', 'hospital', 'admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  privacy_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DONOR PROFILES
CREATE TABLE donor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL
    CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  city TEXT,
  -- Approximate location only: 2 decimals is roughly 1 km accuracy
  approx_latitude NUMERIC(6,2),
  approx_longitude NUMERIC(6,2),
  location_consent BOOLEAN NOT NULL DEFAULT FALSE,
  location_consent_at TIMESTAMPTZ,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  last_donation_date DATE,  -- self-reported; NOT a medical eligibility decision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HOSPITAL PROFILES
CREATE TABLE hospital_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BLOOD REQUESTS
CREATE TABLE blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
  component TEXT NOT NULL
    CHECK (component IN ('whole_blood','red_blood_cells','plasma','platelets')),
  blood_group TEXT NOT NULL
    CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_required INTEGER NOT NULL CHECK (units_required > 0),
  units_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
  urgency TEXT NOT NULL CHECK (urgency IN ('critical','urgent','scheduled')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','matching','donors_notified','awaiting_responses',
                      'partially_fulfilled','fulfilled','cancelled','expired')),
  required_by TIMESTAMPTZ NOT NULL,
  search_radius_km INTEGER NOT NULL DEFAULT 5,
  additional_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. REQUEST RESPONSES (one row per donor per request)
CREATE TABLE request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','contacted','arrived',
                      'screened','donation_completed','did_not_arrive','not_eligible')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, donor_id)
);

-- 6. AUDIT LOGS
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes to speed up common searches
CREATE INDEX idx_donor_match ON donor_profiles (blood_group, is_available);
CREATE INDEX idx_requests_status ON blood_requests (status);
CREATE INDEX idx_responses_request ON request_responses (request_id);

-- SECURITY: Supabase exposes tables through a public API unless
-- Row Level Security is on. Our data is accessed ONLY through our own
-- Express backend, so we turn RLS on and add no public policies.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;