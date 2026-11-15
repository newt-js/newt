CREATE TABLE newt_idempotency_key (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  body_hash TEXT NOT NULL,
  status INTEGER NOT NULL,
  headers TEXT NOT NULL,
  body TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX newt_idempotency_key_expires ON newt_idempotency_key (expires_at);
