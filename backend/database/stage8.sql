CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES blood_requests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'push', 'in_app')),
  message TEXT NOT NULL,
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

-- Same security rule as the other tables: accessed only through our backend
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;