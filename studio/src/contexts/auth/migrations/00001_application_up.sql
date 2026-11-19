CREATE TABLE "application" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  registration TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- auth's own application: its first admin signs up in it, through the setup.
INSERT INTO "application" (id, version, slug, name, registration, created_at, updated_at)
VALUES (
  '01a1f4f7-41e3-755d-adb7-298eb0bc0198', 1, 'auth', 'auth', 'closed',
  '2026-11-19T00:00:00.000Z', '2026-11-19T00:00:00.000Z'
);
