-- A program that signs people in to an application through OAuth. Its secret is only kept hashed;
-- its redirect uris are compared exactly, so they are kept as given.
CREATE TABLE "application_client" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  application_id TEXT NOT NULL REFERENCES "application" (id),
  name TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  redirect_uris JSON NOT NULL,
  post_logout_redirect_uris JSON NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
