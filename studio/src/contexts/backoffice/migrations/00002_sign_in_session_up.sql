-- Who signed in to backoffice. The cookie carries a random token: only its hash is kept here.
-- One session per attempt, so an attempt that comes back twice never opens two.
CREATE TABLE "sign_in_session" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  attempt_id TEXT NOT NULL UNIQUE REFERENCES "sign_in_attempt" (id),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
