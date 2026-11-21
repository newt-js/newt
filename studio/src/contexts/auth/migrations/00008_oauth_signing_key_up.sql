-- The keys that sign tokens: the id is the kid of their header. The private half is encrypted with a secret of .env.
CREATE TABLE "oauth_signing_key" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  public_jwk JSON NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  retired_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
