CREATE TABLE newt_idempotency_key (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  body_hash TEXT COLLATE "C" NOT NULL,
  status INTEGER NOT NULL,
  headers TEXT COLLATE "C" NOT NULL,
  body TEXT COLLATE "C" NOT NULL,
  expires_at TEXT COLLATE "C" NOT NULL
);
CREATE INDEX newt_idempotency_key_expires ON newt_idempotency_key (expires_at);
