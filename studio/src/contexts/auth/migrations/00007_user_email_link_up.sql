-- A link sent by email that works once (used_at) and expires. The email carries a random token: only its hash is kept here.
CREATE TABLE "user_email_link" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id),
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
