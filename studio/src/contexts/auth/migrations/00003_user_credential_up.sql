CREATE TABLE "user_credential" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id),
  kind TEXT NOT NULL,
  -- A password's hash; none for a kind with no secret, as a provider's.
  secret_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One password per user; of other kinds, as passkeys, a user may have many.
CREATE UNIQUE INDEX user_credential_one_password
  ON "user_credential" (user_id) WHERE kind = 'password';
