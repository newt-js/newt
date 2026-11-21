CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  application_id TEXT NOT NULL REFERENCES "application" (id),
  -- None for who signs in without one: by phone, or a provider that gives none.
  email TEXT,
  email_verified BOOLEAN NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- The same email in two applications is two users; no email never collides.
  UNIQUE (application_id, email)
);
