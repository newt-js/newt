-- What someone signed in allowed a client: its code, kept hashed, is exchanged once for tokens within a minute.
CREATE TABLE "oauth_authorization" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  client_id TEXT NOT NULL REFERENCES "application_client" (id),
  user_id TEXT NOT NULL REFERENCES "user" (id),
  redirect_uri TEXT NOT NULL,
  scopes JSON NOT NULL,
  code_challenge TEXT NOT NULL,
  nonce TEXT,
  amr JSON NOT NULL,
  auth_time TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
