
CREATE TABLE vendor_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_sessions_token ON vendor_sessions(session_token);
CREATE INDEX idx_vendor_sessions_vendor ON vendor_sessions(vendor_id);
